const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
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

app.use('/uploads', (req, res, next) => {
  const filePath = path.join(uploadsDir, req.path);
  console.log(`🔍 Request for upload: ${req.path} -> Checking: ${filePath}`);
  if (fs.existsSync(filePath)) {
    console.log('✅ File found on disk');
  } else {
    console.log('❌ File NOT found on disk');
  }
  next();
}, express.static(uploadsDir));
app.use(express.static(clientBuildPath));

// --- API Routes ---
const teamRoutes = require('./server/routes/team');
const adminRoutes = require('./server/routes/admin');
app.use('/api', teamRoutes);
app.use('/api', adminRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// SPA Support
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ message: 'API Not Found' });
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// --- CRITICAL: MongoDB Connection & Server Start ---
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

