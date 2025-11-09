const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

let client = null;
let configured = false;

// Validate common Twilio SID pattern (starts with 'AC' followed by 32 hex chars)
const isValidSid = typeof accountSid === 'string' && /^AC[0-9a-fA-F]{32}$/.test(accountSid);

if (isValidSid && authToken) {
  try {
    client = twilio(accountSid, authToken);
    configured = true;
  } catch (err) {
    console.warn('Twilio client initialization failed:', err.message);
    client = null;
    configured = false;
  }
} else {
  console.warn('Twilio client not configured or TWILIO_ACCOUNT_SID invalid. Admin SMS notifications are disabled.');
}

module.exports = { client, configured };