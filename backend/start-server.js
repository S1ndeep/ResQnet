// Helper script to kill any process on port 5000 before starting
const { exec } = require('child_process');
const os = require('os');

const killPort = () => {
  return new Promise((resolve) => {
    if (os.platform() === 'win32') {
      // Windows
      exec('netstat -ano | findstr :5000 | findstr LISTENING', (error, stdout) => {
        if (stdout) {
          const lines = stdout.trim().split('\n');
          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0') {
              console.log(`Killing process ${pid} on port 5000...`);
              exec(`taskkill /PID ${pid} /F`, () => {});
            }
          });
        }
        setTimeout(resolve, 1000);
      });
    } else {
      // Unix/Linux/Mac
      exec('lsof -ti:5000 | xargs kill -9', () => {
        setTimeout(resolve, 1000);
      });
    }
  });
};

killPort().then(() => {
  console.log('Port 5000 cleared. Starting server...');
  require('./server.js');
});



