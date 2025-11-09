const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const createAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGODB || process.env.MONGO;
    if (!mongoUri) {
      throw new Error('No MongoDB connection string found in environment (MONGO_URI or MONGODB_URI)');
    }
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@disaster.com' });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email: admin@disaster.com');
      console.log('Password: (use the one you set, or reset it)');
      await mongoose.disconnect();
      return;
    }

    // Create admin user
    const admin = new User({
      name: 'Admin User',
      email: 'admin@disaster.com',
      password: 'admin123', // Will be hashed automatically
      role: 'admin',
      phone: '1234567890'
    });

    await admin.save();
    console.log('\n✅ Admin user created successfully!');
    console.log('\n📧 Admin Credentials:');
    console.log('   Email: admin@disaster.com');
    console.log('   Password: admin123');
    console.log('\n⚠️  Please change the password after first login!\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();

