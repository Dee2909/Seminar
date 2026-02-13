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
  origin: true, // Allow all origins
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Static files
const uploadsDir = path.join(__dirname, 'uploads');
const clientBuildPath = path.join(__dirname, 'built');
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(clientBuildPath));

// --- API Routes ---
const teamRoutes = require('./routes/team');
const adminRoutes = require('./routes/admin');
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

