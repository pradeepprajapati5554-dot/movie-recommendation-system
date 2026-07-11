const mongoose = require('mongoose');

// Handles the MongoDB connection separately from the rest of the app,
// so the database concern lives in one clear place.
const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/movieflix';

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB Connected - movieflix database');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('   Make sure MongoDB is installed and running, and MONGO_URI in .env is correct.');
    // We don't exit the process here so the API can still boot and report
    // a clear error to the frontend instead of hard-crashing on start.
  }

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB runtime error:', err.message);
  });
};

module.exports = connectDB;
