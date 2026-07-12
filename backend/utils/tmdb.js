const axios = require('axios');

// A pre-configured axios instance for The Movie Database (TMDB) API,
// so the API key and base URL only live in one place.
const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  timeout: 8000,
  params: {
    api_key: process.env.TMDB_API_KEY
  }
});

// When several categories (trending, popular, bollywood, etc.) load at the
// same time on page load, an occasional single request can time out or hit
// a momentary TMDB hiccup (or a 429 rate-limit) even though the API key and
// network are fine. Rather than surface that as a hard error to the user,
// automatically retry that one request once or twice with a short delay
// before giving up.
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryable = (err) => {
  if (!err.response) return true; // network error / timeout - worth retrying
  return err.response.status === 429 || err.response.status >= 500;
};

tmdb.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    config.__retryCount = config.__retryCount || 0;

    if (config.__retryCount < MAX_RETRIES && isRetryable(error)) {
      config.__retryCount += 1;
      await wait(RETRY_DELAY_MS * config.__retryCount);
      return tmdb(config);
    }

    return Promise.reject(error);
  }
);

module.exports = tmdb;
