const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// --- Middleware ---
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) || origin.includes('onrender.com')) {
      callback(null, true);
    } else {
      callback(null, true); // Fallback to allow for testing
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Static files
const uploadsDir = path.resolve(__dirname, 'server', 'uploads');
const clientBuildPath = path.resolve(__dirname, 'server', 'built');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  console.log('📁 Creating uploads directory at:', uploadsDir);
  fs.mkdirSync(uploadsDir, { recursive: true });
}

console.log('📂 Serving uploads from:', uploadsDir);
console.log('🌐 Serving client from:', clientBuildPath);

app.get('/uploads/:filename', async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadsDir, filename);

  // 1. Try serving from local disk first
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  // 2. Fallback to MongoDB GridFS
  try {
    const gfs = app.locals.gfs;
    if (!gfs) return res.status(404).send('File not found');

    const files = await gfs.find({ filename }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).send('File not found');
    }

    // Set proper video/content type if possible
    if (filename.endsWith('.webm')) res.set('Content-Type', 'video/webm');
    if (filename.endsWith('.pdf')) res.set('Content-Type', 'application/pdf');

    const readStream = gfs.openDownloadStreamByName(filename);
    readStream.pipe(res);
  } catch (err) {
    console.error('GridFS Fetch Error:', err);
    res.status(500).send('Error fetching file');
  }
});

app.use(express.static(clientBuildPath));

// --- API Routes ---
const teamRoutes = require('./server/routes/team');
const adminRoutes = require('./server/routes/admin');
app.use('/api', teamRoutes);
app.use('/api', adminRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Debug: List Uploads (To help you see what's on Render)
app.get('/api/debug/uploads', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    res.json({ uploadsDir, files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA Support
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ message: 'API Not Found' });
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// --- CRITICAL: MongoDB Connection & Server Start ---
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

let gfs;

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');

    // Initialize GridFS
    const conn = mongoose.connection;
    gfs = new mongoose.mongo.GridFSBucket(conn.db, {
      bucketName: 'uploads'
    });
    app.locals.gfs = gfs;
    console.log('📦 GridFS Bucket Initialized');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

