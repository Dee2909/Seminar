require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const path = require('path');

const Admin = require('../models/Admin');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI in environment.');
  process.exit(1);
}

const USERNAME = process.env.ADMIN_USERNAME || 'admin';
const PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function main() {
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('✅ Connected to MongoDB');

    const password_hash = await bcrypt.hash(PASSWORD, 10);

    let admin = await Admin.findOne({ username: USERNAME });
    if (admin) {
      admin.password_hash = password_hash;
      await admin.save();
      console.log(`✅ Updated existing admin "${USERNAME}" with new password.`);
    } else {
      admin = new Admin({ username: USERNAME, password_hash });
      await admin.save();
      console.log(`✅ Created admin "${USERNAME}".`);
    }

    console.log(`You can log in with:\n  username: ${USERNAME}\n  password: ${PASSWORD}`);
  } catch (err) {
    console.error('❌ Error creating admin:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();

