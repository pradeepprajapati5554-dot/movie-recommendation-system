require('dotenv').config();
const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const movieRoutes = require('./routes/movieRoutes');
const watchlistRoutes = require('./routes/watchlistRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Fail loudly (but don't crash) if required secrets are missing, since a
// missing JWT_SECRET would otherwise cause confusing auth errors later.
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET is not set in .env — using an insecure default. Set it before deploying.');
  process.env.JWT_SECRET = 'dev_only_insecure_secret_change_me';
}
if (!process.env.TMDB_API_KEY) {
  console.warn('⚠️  TMDB_API_KEY is not set in .env — movie endpoints will fail until it is.');
}

// Database
connectDB();

// Core middleware
app.use(cors());
app.use(express.json());

// Health check - useful to confirm the backend is up before testing the app
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MovieFlix API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/watchlist', watchlistRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Centralized error handler (catches anything thrown/passed to next())
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack || err.message);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
