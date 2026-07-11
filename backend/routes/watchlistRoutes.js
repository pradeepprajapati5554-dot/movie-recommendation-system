const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const tmdb = require('../utils/tmdb');

const router = express.Router();

// GET /api/watchlist
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.watchlist.length) return res.json([]);

    const movies = await Promise.all(
      user.watchlist.map((id) =>
        tmdb.get(`/movie/${id}`).then((r) => r.data).catch(() => null)
      )
    );
    res.json(movies.filter(Boolean));
  } catch (err) {
    console.error('Watchlist fetch error:', err.message);
    res.status(500).json({ message: 'Server error fetching watchlist' });
  }
});

// POST /api/watchlist/:movieId
router.post('/:movieId', authMiddleware, async (req, res) => {
  try {
    const movieId = parseInt(req.params.movieId, 10);
    if (Number.isNaN(movieId)) return res.status(400).json({ message: 'Invalid movie id' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.watchlist.includes(movieId)) {
      user.watchlist.push(movieId);
      await user.save();
    }
    res.json({ message: 'Added to watchlist' });
  } catch (err) {
    console.error('Watchlist add error:', err.message);
    res.status(500).json({ message: 'Server error updating watchlist' });
  }
});

// DELETE /api/watchlist/:movieId
router.delete('/:movieId', authMiddleware, async (req, res) => {
  try {
    const movieId = parseInt(req.params.movieId, 10);
    if (Number.isNaN(movieId)) return res.status(400).json({ message: 'Invalid movie id' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.watchlist = user.watchlist.filter((id) => id !== movieId);
    await user.save();
    res.json({ message: 'Removed from watchlist' });
  } catch (err) {
    console.error('Watchlist remove error:', err.message);
    res.status(500).json({ message: 'Server error updating watchlist' });
  }
});

module.exports = router;
