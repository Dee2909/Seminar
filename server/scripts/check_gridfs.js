const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env file');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    const conn = mongoose.connection;
    const bucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'uploads' });
    
    const files = await bucket.find({}).toArray();
    
    console.log(`\n📦 Found ${files.length} files in MongoDB GridFS:\n`);
    
    files.forEach(file => {
      console.log(`- 📄 ${file.filename}`);
      console.log(`  Hit: ${(file.length / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  📅 ${new Date(file.uploadDate).toLocaleString()}\n`);
    });

    if (files.length === 0) {
      console.log('⚠️ No files found in GridFS. They might only be on local disk.');
    }

    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
