const axios = require('axios');

// A pre-configured axios instance for The Movie Database (TMDB) API,
// so the API key and base URL only live in one place.
const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  params: {
    api_key: process.env.TMDB_API_KEY
  }
});

module.exports = tmdb;
