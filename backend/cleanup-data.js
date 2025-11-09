const mongoose = require('mongoose');
require('dotenv').config();

const Incident = require('./models/Incident');
const VolunteerProfile = require('./models/VolunteerProfile');
const Task = require('./models/Task');

// Use the same MongoDB URI as server.js
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/disaster-management';

async function cleanupData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log(`   URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}\n`); // Hide credentials
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    // Delete all tasks first (they reference volunteers and incidents)
    console.log('🗑️  Deleting all tasks...');
    const tasksResult = await Task.deleteMany({});
    console.log(`   ✅ Deleted ${tasksResult.deletedCount} task(s)\n`);

    // Delete all incidents
    console.log('🗑️  Deleting all incidents...');
    const incidentsResult = await Incident.deleteMany({});
    console.log(`   ✅ Deleted ${incidentsResult.deletedCount} incident(s)\n`);

    // Delete all volunteer profiles
    console.log('🗑️  Deleting all volunteer profiles...');
    const volunteersResult = await VolunteerProfile.deleteMany({});
    console.log(`   ✅ Deleted ${volunteersResult.deletedCount} volunteer profile(s)\n`);

    console.log('✨ Cleanup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Tasks deleted: ${tasksResult.deletedCount}`);
    console.log(`   - Incidents deleted: ${incidentsResult.deletedCount}`);
    console.log(`   - Volunteer profiles deleted: ${volunteersResult.deletedCount}`);
    console.log('\n💡 You can now add new incidents and volunteers.\n');
    console.log('⚠️  Note: User accounts and other data (HelpRequests, Resources, Alerts) were NOT deleted.');
    console.log('   Only Incidents, Volunteers, and Tasks were removed.\n');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed.');
  }
}

// Run cleanup
console.log('🚀 Starting data cleanup...\n');
cleanupData();

