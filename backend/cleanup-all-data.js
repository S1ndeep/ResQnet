const mongoose = require('mongoose');
require('dotenv').config();

const Incident = require('./models/Incident');
const VolunteerProfile = require('./models/VolunteerProfile');
const Task = require('./models/Task');
const HelpRequest = require('./models/HelpRequest');
const Resource = require('./models/Resource');
const Alert = require('./models/Alert');

// Note: User accounts are NOT deleted (keeps admin accounts)
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/disaster-management';

async function cleanupAllData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    const results = {};

    // Delete all tasks first (they reference volunteers and incidents)
    console.log('🗑️  Deleting all tasks...');
    results.tasks = await Task.deleteMany({});
    console.log(`   ✅ Deleted ${results.tasks.deletedCount} task(s)\n`);

    // Delete all incidents
    console.log('🗑️  Deleting all incidents...');
    results.incidents = await Incident.deleteMany({});
    console.log(`   ✅ Deleted ${results.incidents.deletedCount} incident(s)\n`);

    // Delete all volunteer profiles
    console.log('🗑️  Deleting all volunteer profiles...');
    results.volunteers = await VolunteerProfile.deleteMany({});
    console.log(`   ✅ Deleted ${results.volunteers.deletedCount} volunteer profile(s)\n`);

    // Delete all help requests (old system)
    console.log('🗑️  Deleting all help requests...');
    results.helpRequests = await HelpRequest.deleteMany({});
    console.log(`   ✅ Deleted ${results.helpRequests.deletedCount} help request(s)\n`);

    // Delete all resources
    console.log('🗑️  Deleting all resources...');
    results.resources = await Resource.deleteMany({});
    console.log(`   ✅ Deleted ${results.resources.deletedCount} resource(s)\n`);

    // Delete all alerts
    console.log('🗑️  Deleting all alerts...');
    results.alerts = await Alert.deleteMany({});
    console.log(`   ✅ Deleted ${results.alerts.deletedCount} alert(s)\n`);

    console.log('✨ Complete cleanup finished!\n');
    console.log('📊 Summary:');
    console.log(`   - Tasks: ${results.tasks.deletedCount}`);
    console.log(`   - Incidents: ${results.incidents.deletedCount}`);
    console.log(`   - Volunteer Profiles: ${results.volunteers.deletedCount}`);
    console.log(`   - Help Requests: ${results.helpRequests.deletedCount}`);
    console.log(`   - Resources: ${results.resources.deletedCount}`);
    console.log(`   - Alerts: ${results.alerts.deletedCount}`);
    console.log('\n💡 User accounts (admins, civilians, volunteers) were preserved.');
    console.log('   You can now add fresh data for your official product!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed.');
  }
}

cleanupAllData();

