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
  origin: true, // Allow all origins
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// --- Static Setup ---
const uploadsDir = path.join(__dirname, 'uploads');
const clientBuildPath = path.join(__dirname, 'built');
app.use(express.static(clientBuildPath));

// --- API Routes ---
const teamRoutes = require('./routes/team');
const adminRoutes = require('./routes/admin');
app.use('/api', teamRoutes);
app.use('/api', adminRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Dynamic Uploads serving with GridFS fallback
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
    if (!gfs) return res.status(404).send('File not found (GridFS not ready)');

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

// SPA Support
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ message: 'API Not Found' });
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// --- CRITICAL: MongoDB Connection & Server Start ---
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5001; // Match .env

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
    console.log('📦 GridFS Bucket Initialized (Server directory)');

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // Initialize Socket.io
    const { Server } = require('socket.io');
    const io = new Server(server, {
      cors: {
        origin: ["http://localhost:5173", "http://127.0.0.1:5173"], // Allow Vite client
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    require('./socket')(io);
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

