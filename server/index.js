require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');

const connectDB = require('./config/db');

const app = express();

// --- Config ---
const PORT = process.env.PORT || 5001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// --- MongoDB connection ---
connectDB();

// --- Middleware ---
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow any localhost origin or the render URL
      if (!origin || /^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) || origin.includes('onrender.com')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Static uploads folder for project files
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Serve frontend static files in production
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuildPath));

// --- Routes ---
const teamRoutes = require('./routes/team');
const adminRoutes = require('./routes/admin');

app.use('/api', teamRoutes);
app.use('/api', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// For SPA - Send index.html for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});

