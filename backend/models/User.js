const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phone: { type: String, unique: true, sparse: true, trim: true },
  password: { type: String, required: true },
  watchlist: [{ type: Number }], // stores TMDB movie IDs
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
