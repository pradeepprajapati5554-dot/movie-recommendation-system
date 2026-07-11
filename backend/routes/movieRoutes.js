const express = require('express');
const tmdb = require('../utils/tmdb');

const router = express.Router();

// Logs the *actual* reason TMDB rejected a request (invalid key, rate limit,
// suspended key, etc.) instead of just axios's generic "Request failed..."
// message, and returns that reason to the frontend so it's visible on screen.
const handleTmdbError = (err, res, label) => {
  const status = err.response?.status;
  const tmdbMessage = err.response?.data?.status_message;
  console.error(`TMDB ${label} error:`, status ? `HTTP ${status} - ${tmdbMessage || err.message}` : err.message);

  res.status(500).json({
    message: tmdbMessage
      ? `Failed to fetch ${label} movies: ${tmdbMessage}`
      : `Failed to fetch ${label} movies`
  });
};

// GET /api/movies/trending
router.get('/trending', async (req, res) => {
  try {
    const { data } = await tmdb.get('/trending/movie/week');
    res.json(data.results);
  } catch (err) {
    handleTmdbError(err, res, 'trending');
  }
});

// GET /api/movies/originals (top rated)
router.get('/originals', async (req, res) => {
  try {
    const { data } = await tmdb.get('/movie/top_rated');
    res.json(data.results);
  } catch (err) {
    handleTmdbError(err, res, 'top rated');
  }
});

// GET /api/movies/popular
router.get('/popular', async (req, res) => {
  try {
    const { data } = await tmdb.get('/movie/popular');
    res.json(data.results);
  } catch (err) {
    handleTmdbError(err, res, 'popular');
  }
});

// GET /api/movies/bollywood - Hindi-language movies, sorted by popularity
router.get('/bollywood', async (req, res) => {
  try {
    const { data } = await tmdb.get('/discover/movie', {
      params: {
        with_original_language: 'hi',
        sort_by: 'popularity.desc',
        region: 'IN'
      }
    });
    res.json(data.results);
  } catch (err) {
    handleTmdbError(err, res, 'Bollywood');
  }
});

// GET /api/movies/hollywood - English-language movies, sorted by popularity
router.get('/hollywood', async (req, res) => {
  try {
    const { data } = await tmdb.get('/discover/movie', {
      params: {
        with_original_language: 'en',
        sort_by: 'popularity.desc',
        region: 'US'
      }
    });
    res.json(data.results);
  } catch (err) {
    handleTmdbError(err, res, 'Hollywood');
  }
});

// GET /api/movies/search?query=...
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ message: 'Query parameter is required' });

    const { data } = await tmdb.get('/search/movie', { params: { query } });
    res.json(data.results);
  } catch (err) {
    handleTmdbError(err, res, 'search');
  }
});

module.exports = router;
