const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const uploadsDir = path.join(__dirname, '../uploads');

async function uploadToGridFS(filename, db) {
  const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
  const filePath = path.join(uploadsDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found on disk: ${filename}`);
    return;
  }

  console.log(`🚀 Syncing ${filename} to MongoDB...`);
  const uploadStream = bucket.openUploadStream(filename);
  const readStream = fs.createReadStream(filePath);

  return new Promise((resolve, reject) => {
    readStream.pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => {
        console.log(`✅ Successfully synced to MongoDB GridFS: ${filename}`);
        resolve();
      });
  });
}

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    const files = fs.readdirSync(uploadsDir);
    const webmFiles = files.filter(f => f.endsWith('.webm'));

    if (webmFiles.length === 0) {
      console.log('ℹ️ No .webm files found in uploads folder to sync.');
    } else {
      for (const file of webmFiles) {
        await uploadToGridFS(file, mongoose.connection.db);
      }
    }

    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
