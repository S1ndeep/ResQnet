const mongoose = require('mongoose');
require('dotenv').config();

const Incident = require('./models/Incident');
const VolunteerProfile = require('./models/VolunteerProfile');
const Task = require('./models/Task');
const HelpRequest = require('./models/HelpRequest');
const Resource = require('./models/Resource');
const Alert = require('./models/Alert');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/disaster-management';

async function viewData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');
    
    console.log('📊 Current Database Statistics:\n');
    
    const counts = {
      users: await User.countDocuments(),
      incidents: await Incident.countDocuments(),
      volunteers: await VolunteerProfile.countDocuments(),
      tasks: await Task.countDocuments(),
      helpRequests: await HelpRequest.countDocuments(),
      resources: await Resource.countDocuments(),
      alerts: await Alert.countDocuments()
    };
    
    console.log('Collection Counts:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Object.entries(counts).forEach(([name, count]) => {
      const paddedName = name.padEnd(20);
      console.log(`   ${paddedName}: ${count}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('💡 Total records:', Object.values(counts).reduce((a, b) => a + b, 0));
    
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed.');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

viewData();

