const express = require('express');
const tmdb = require('../utils/tmdb');

const router = express.Router();

// Small helper so every route logs the *actual* reason TMDB rejected the
// request (invalid key, rate limit, network issue, etc.) instead of just a
// generic message. This is what you should check in the backend terminal
// whenever the frontend shows "Failed to fetch ...".
const logTmdbError = (label, err) => {
  if (err.response) {
    // TMDB responded with an error status (e.g. 401 invalid API key, 404, 429 rate limited)
    console.error(`TMDB ${label} error: status ${err.response.status} -`, err.response.data);
  } else if (err.request) {
    // Request was sent but no response came back (network/DNS/firewall issue)
    console.error(`TMDB ${label} error: no response received -`, err.message);
  } else {
    console.error(`TMDB ${label} error:`, err.message);
  }
};

// GET /api/movies/trending
router.get('/trending', async (req, res) => {
  try {
    const { data } = await tmdb.get('/trending/movie/week');
    res.json(data.results);
  } catch (err) {
    logTmdbError('trending', err);
    res.status(500).json({ message: 'Failed to fetch trending movies' });
  }
});

// GET /api/movies/bollywood - Hindi-language movies, sorted by popularity
router.get('/bollywood', async (req, res) => {
  try {
    const { data } = await tmdb.get('/discover/movie', {
      params: {
        with_original_language: 'hi',
        sort_by: 'popularity.desc',
        include_adult: false
      }
    });
    res.json(data.results);
  } catch (err) {
    logTmdbError('bollywood', err);
    res.status(500).json({ message: 'Failed to fetch Bollywood movies' });
  }
});

// GET /api/movies/hollywood - English-language movies, sorted by popularity
router.get('/hollywood', async (req, res) => {
  try {
    const { data } = await tmdb.get('/discover/movie', {
      params: {
        with_original_language: 'en',
        sort_by: 'popularity.desc',
        include_adult: false
      }
    });
    res.json(data.results);
  } catch (err) {
    logTmdbError('hollywood', err);
    res.status(500).json({ message: 'Failed to fetch Hollywood movies' });
  }
});

// GET /api/movies/world - popular movies from all languages/regions (no language filter)
router.get('/world', async (req, res) => {
  try {
    const { data } = await tmdb.get('/discover/movie', {
      params: {
        sort_by: 'popularity.desc',
        include_adult: false
      }
    });
    res.json(data.results);
  } catch (err) {
    logTmdbError('world', err);
    res.status(500).json({ message: 'Failed to fetch movies from around the world' });
  }
});

// GET /api/movies/originals (top rated)
router.get('/originals', async (req, res) => {
  try {
    const { data } = await tmdb.get('/movie/top_rated');
    res.json(data.results);
  } catch (err) {
    logTmdbError('top-rated', err);
    res.status(500).json({ message: 'Failed to fetch top rated movies' });
  }
});

// GET /api/movies/popular
router.get('/popular', async (req, res) => {
  try {
    const { data } = await tmdb.get('/movie/popular');
    res.json(data.results);
  } catch (err) {
    logTmdbError('popular', err);
    res.status(500).json({ message: 'Failed to fetch popular movies' });
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
    logTmdbError('search', err);
    res.status(500).json({ message: 'Failed to search movies' });
  }
});

// GET /api/movies/genres - list of all TMDB genres (id + name), used to build
// the genre filter buttons (Action, Comedy, Drama, Horror, etc.) on the frontend.
router.get('/genres', async (req, res) => {
  try {
    const { data } = await tmdb.get('/genre/movie/list');
    res.json(data.genres);
  } catch (err) {
    logTmdbError('genres', err);
    res.status(500).json({ message: 'Failed to fetch genres' });
  }
});

// GET /api/movies/genre/:id - popular movies belonging to a specific genre id
router.get('/genre/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = await tmdb.get('/discover/movie', {
      params: {
        with_genres: id,
        sort_by: 'popularity.desc',
        include_adult: false
      }
    });
    res.json(data.results);
  } catch (err) {
    logTmdbError(`genre-${req.params.id}`, err);
    res.status(500).json({ message: 'Failed to fetch movies for this genre' });
  }
});

module.exports = router;
