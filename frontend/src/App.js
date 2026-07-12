import React, { useState, useEffect } from 'react';
import './App.css';
import { Sun, Moon, Play, Plus, Star, Flame, X, User, LogOut, Check, Globe, Clapperboard, Landmark, Search } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

const App = () => {
  const [theme, setTheme] = useState('dark');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredMovie, setHoveredMovie] = useState(null);
  const [activeCategory, setActiveCategory] = useState('trending');

  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [loginType, setLoginType] = useState('email');
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');

  // Movie state
  const [movies, setMovies] = useState({ trending: [], originals: [], popular: [], bollywood: [], hollywood: [], world: [], watchlist: [] });
  const [movieErrors, setMovieErrors] = useState({ trending: null, originals: null, popular: null, bollywood: null, hollywood: null, world: null, watchlist: null });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');

  // Genre state - list of {id, name} from TMDB, plus which genre (if any) is active
  const [genres, setGenres] = useState([]);
  const [activeGenreId, setActiveGenreId] = useState(null);
  const [genreLoading, setGenreLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [previousCategory, setPreviousCategory] = useState('trending');

  // Load user from localStorage on start
  useEffect(() => {
    const savedUser = localStorage.getItem('mf_user');
    const savedToken = localStorage.getItem('mf_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch movies on load
  useEffect(() => {
    fetchMovies();
    fetchGenres();
  }, []);

  // Fetch watchlist when user logs in
  useEffect(() => {
    if (user && token) fetchWatchlist();
  }, [user, token]);

  // Fetches one category, updates its movies on success or its error on failure.
  // Fetching each category independently (instead of one Promise.all) means one
  // broken category (e.g. a bad TMDB key) doesn't hide the others.
  const fetchCategory = async (category, endpoint) => {
    try {
      const res = await fetch(`${API}/movies/${endpoint}`);
      const data = await res.json();

      if (!res.ok) {
        // Backend responded, but with an error (bad/expired TMDB key, rate limit, etc.)
        setMovieErrors(prev => ({ ...prev, [category]: data.message || 'Failed to load movies' }));
        setMovies(prev => ({ ...prev, [category]: [] }));
        return;
      }

      const list = Array.isArray(data) ? data : (data.results || []);
      setMovies(prev => ({ ...prev, [category]: list }));
      setMovieErrors(prev => ({ ...prev, [category]: null }));
    } catch (err) {
      // Network-level failure - backend isn't reachable at all
      console.error(`Failed to fetch ${category}:`, err);
      setMovieErrors(prev => ({ ...prev, [category]: 'Cannot reach the backend. Make sure it is running on port 5000.' }));
      setMovies(prev => ({ ...prev, [category]: [] }));
    }
  };

  const fetchMovies = async () => {
    setLoading(true);
    await Promise.all([
      fetchCategory('trending', 'trending'),
      fetchCategory('originals', 'originals'),
      fetchCategory('popular', 'popular'),
      fetchCategory('bollywood', 'bollywood'),
      fetchCategory('hollywood', 'hollywood'),
      fetchCategory('world', 'world'),
    ]);
    setLoading(false);
  };

  const fetchGenres = async () => {
    try {
      const res = await fetch(`${API}/movies/genres`);
      const data = await res.json();
      if (res.ok) setGenres(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch genres:', err);
    }
  };

  // Clicking a genre pill (Action, Comedy, Drama, etc.) loads movies for that
  // genre into their own category slot ("genre_<id>") and switches to it, so
  // switching back to Trending/Popular/etc. still shows their cached results.
  const selectGenre = async (genre) => {
    setActiveGenreId(genre.id);
    setIsSearching(false);
    setSearchQuery('');
    const categoryKey = `genre_${genre.id}`;
    setActiveCategory(categoryKey);

    const alreadyLoaded = movies[categoryKey] !== undefined && !movieErrors[categoryKey];
    if (alreadyLoaded) return; // loaded successfully before, no need to refetch

    setGenreLoading(true);
    await fetchCategory(categoryKey, `genre/${genre.id}`);
    setGenreLoading(false);
  };

  const clearGenre = (categoryId) => {
    setActiveGenreId(null);
    setIsSearching(false);
    setSearchQuery('');
    setActiveCategory(categoryId);
  };

  // Runs a title search against the backend, which proxies TMDB's
  // /search/movie endpoint. Results live in their own "search" category slot,
  // and switching away simply returns to whatever tab was active before.
  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    if (!isSearching) setPreviousCategory(activeCategory);
    setActiveGenreId(null);
    setIsSearching(true);
    setActiveCategory('search');
    setSearchLoading(true);
    await fetchCategory('search', `search?query=${encodeURIComponent(q)}`);
    setSearchLoading(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setActiveCategory(previousCategory);
  };

  const fetchWatchlist = async () => {
    try {
      const res = await fetch(`${API}/watchlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) {
        setMovieErrors(prev => ({ ...prev, watchlist: data.message || 'Failed to load watchlist' }));
        return;
      }

      const watchlist = Array.isArray(data) ? data : (data.results || []);
      setMovies(prev => ({ ...prev, watchlist }));
      setMovieErrors(prev => ({ ...prev, watchlist: null }));
    } catch (err) {
      console.error('Failed to fetch watchlist:', err);
      setMovieErrors(prev => ({ ...prev, watchlist: 'Cannot reach the backend. Make sure it is running on port 5000.' }));
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const showNotif = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleAuth = async () => {
    setAuthError('');
    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
    const body = {
      ...(authMode === 'register' && { name: authForm.name }),
      ...(loginType === 'email' ? { email: authForm.email } : { phone: authForm.phone }),
      password: authForm.password
    };

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.message); return; }

      localStorage.setItem('mf_token', data.token);
      localStorage.setItem('mf_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setShowAuthModal(false);
      setAuthForm({ name: '', email: '', phone: '', password: '' });
      showNotif(`Welcome ${data.user.name || 'back'}! 🎬`);
    } catch {
      setAuthError('Server error. Make sure backend is running on port 5000.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mf_token');
    localStorage.removeItem('mf_user');
    setUser(null);
    setToken('');
    setMovies(prev => ({ ...prev, watchlist: [] }));
    showNotif('Logged out successfully');
  };

  const handleWatchlist = async (movie) => {
    if (!user) { setShowAuthModal(true); return; }
    const inWatchlist = movies.watchlist.some(m => m.id === movie.id);
    try {
      const res = await fetch(`${API}/watchlist/${movie.id}`, {
        method: inWatchlist ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (inWatchlist) {
          setMovies(prev => ({ ...prev, watchlist: prev.watchlist.filter(m => m.id !== movie.id) }));
          showNotif('Removed from watchlist');
        } else {
          setMovies(prev => ({ ...prev, watchlist: [...prev.watchlist, movie] }));
          showNotif('Added to watchlist ✅');
        }
      } else {
        showNotif(data.message || 'Could not update watchlist');
      }
    } catch {
      showNotif('Cannot reach the backend. Make sure it is running on port 5000.');
    }
  };

  const categories = [
    { id: 'trending', label: 'Trending Now', icon: Flame },
    { id: 'originals', label: 'Originals', icon: Star },
    { id: 'popular', label: 'Popular', icon: Play },
    { id: 'bollywood', label: 'Bollywood', icon: Landmark },
    { id: 'hollywood', label: 'Hollywood', icon: Clapperboard },
    { id: 'world', label: 'World Cinema', icon: Globe },
    { id: 'watchlist', label: 'Watchlist', icon: Plus },
  ];

  const currentMovies = movies[activeCategory] || [];

  return (
    <div className={`app app--${theme}`}>

      {/* Notification Toast */}
      {notification && (
        <div className="notification">{notification}</div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header__left">
          <div className="logo">
            <span className="logo__text">Movies Recommendation System</span>
          </div>

          <form className="search-bar" onSubmit={handleSearch}>
            <Search size={18} className="search-bar__icon" />
            <input
              type="text"
              className="search-bar__input"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-bar__clear"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </form>
        </div>

        <div className="header__right">
          <div className="clock">
            <div className="clock__time">{formatTime(currentTime)}</div>
            <div className="clock__date">{formatDate(currentTime)}</div>
          </div>

          {/* Login/User Button */}
          {user ? (
            <div className="user-menu">
              <div className="user-info">
                <User size={18} />
                <span>{user.name || user.email || user.phone}</span>
              </div>
              <button className="logout-btn" onClick={handleLogout} title="Logout">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button className="login-btn" onClick={() => setShowAuthModal(true)}>
              <User size={18} /> Sign In
            </button>
          )}

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero__content">
          <h1 className="hero__title">{user ? `Welcome, ${user.name || 'Movie Lover'}!` : 'Welcome Back'}</h1>
          <p className="hero__subtitle">Discover your next favorite movie</p>
          <div className="hero__actions">
            <button className="btn btn--primary">
              <Play size={20} /> Start Watching
            </button>
            <button className="btn btn--secondary" onClick={() => !user && setShowAuthModal(true)}>
              <Plus size={20} /> Add to List
            </button>
          </div>
        </div>
        <div className="hero__decoration"></div>
      </section>

      {/* Category Navigation */}
      <nav className="categories">
        {categories.map((cat) => {
          const IconComponent = cat.icon;
          return (
            <button
              key={cat.id}
              className={`category-btn ${activeCategory === cat.id ? 'category-btn--active' : ''}`}
              onClick={() => clearGenre(cat.id)}
            >
              <IconComponent size={20} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Genre Filter */}
      {genres.length > 0 && (
        <nav className="categories categories--genres">
          {genres.map((genre) => (
            <button
              key={genre.id}
              className={`category-btn category-btn--genre ${activeGenreId === genre.id ? 'category-btn--active' : ''}`}
              onClick={() => selectGenre(genre)}
            >
              <span>{genre.name}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Movies Grid */}
      <section className="content">
        {isSearching ? (
          <h2 className="content__heading">
            Search results for "{searchQuery}"
          </h2>
        ) : activeGenreId && (
          <h2 className="content__heading">
            {genres.find(g => g.id === activeGenreId)?.name} Movies
          </h2>
        )}
        {(isSearching && searchLoading) || (loading && activeCategory !== 'watchlist' && !activeGenreId && !isSearching) || (activeGenreId && genreLoading) ? (
          <div className="loading">
            <div className="loading__spinner"></div>
            <p>Loading movies...</p>
          </div>
        ) : movieErrors[activeCategory] ? (
          <div className="empty-state">
            <p>⚠️ {movieErrors[activeCategory]}</p>
            <button
              className="btn btn--primary"
              style={{ marginTop: '12px' }}
              onClick={() => {
                if (isSearching) handleSearch({ preventDefault: () => {} });
                else if (activeCategory === 'watchlist') fetchWatchlist();
                else if (activeGenreId) selectGenre({ id: activeGenreId, name: genres.find(g => g.id === activeGenreId)?.name });
                else fetchMovies();
              }}
            >
              Try Again
            </button>
          </div>
        ) : currentMovies.length === 0 ? (
          <div className="empty-state">
            {activeCategory === 'watchlist' ? (
              <>
                <p>Your watchlist is empty.</p>
                <p>{user ? 'Click + on any movie to add it!' : 'Sign in to save movies to your watchlist.'}</p>
                {!user && <button className="btn btn--primary" style={{marginTop:'12px'}} onClick={() => setShowAuthModal(true)}>Sign In</button>}
              </>
            ) : (
              <p>No movies found.</p>
            )}
          </div>
        ) : (
          <div className="movies-grid">
            {currentMovies.map((movie) => {
              const inWatchlist = movies.watchlist.some(m => m.id === movie.id);
              const posterUrl = movie.poster_path ? `${TMDB_IMG}${movie.poster_path}` : null;
              return (
                <div
                  key={movie.id}
                  className="movie-card"
                  onMouseEnter={() => setHoveredMovie(movie.id)}
                  onMouseLeave={() => setHoveredMovie(null)}
                >
                  <div
                    className="movie-card__image"
                    style={!posterUrl ? { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' } : {}}
                  >
                    {posterUrl && <img src={posterUrl} alt={movie.title} loading="lazy" />}
                    <div className="movie-card__overlay">
                      <div className="movie-card__actions">
                        <button className="action-btn action-btn--play" title="Play">
                          <Play size={24} />
                        </button>
                        <button
                          className={`action-btn ${inWatchlist ? 'action-btn--added' : 'action-btn--add'}`}
                          title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                          onClick={(e) => { e.stopPropagation(); handleWatchlist(movie); }}
                        >
                          {inWatchlist ? <Check size={24} /> : <Plus size={24} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="movie-card__info">
                    <h3 className="movie-card__title">{movie.title}</h3>
                    <div className="movie-card__meta">
                      <div className="movie-card__rating">
                        <Star size={16} />
                        <span>{movie.vote_average ? movie.vote_average.toFixed(1) : movie.rating}</span>
                      </div>
                      <span className="movie-card__genre">
                        {movie.genre || (movie.genre_ids && genres.find(g => g.id === movie.genre_ids[0])?.name) || ''}
                      </span>
                      <span className="movie-card__year">{movie.release_date ? movie.release_date.slice(0, 4) : movie.year}</span>
                    </div>
                  </div>

                  {hoveredMovie === movie.id && (
                    <div className="movie-card__expanded">
                      <p className="movie-card__description">
                        {movie.overview ? movie.overview.slice(0, 100) + '...' : 'Experience an unforgettable journey into a world of wonder, mystery, and intrigue.'}
                      </p>
                      <div className="movie-card__expanded-actions">
                        <button className="btn btn--small btn--primary">Play Now</button>
                        <button className="btn btn--small btn--secondary" onClick={() => handleWatchlist(movie)}>
                          {inWatchlist ? 'Remove' : '+ Watchlist'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer__content">
          <div className="footer__section">
            <h4>About Movies Recommendation System</h4>
            <p>Your ultimate streaming destination for movies, series, and more.</p>
          </div>
          <div className="footer__section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#browse">Browse</a></li>
              <li><a href="#help">Help</a></li>
            </ul>
          </div>
          <div className="footer__section">
            <h4>Legal</h4>
            <ul>
              <li><a href="#terms">Terms of Use</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#cookies">Cookie Settings</a></li>
            </ul>
          </div>
        </div>

        {/* Developer Credit Section */}
        <div className="footer__divider"></div>
        <div className="footer__credit">
          <div className="credit-container">
            <h2 className="credit-title">🎬 Movies Recommendation System</h2>
            <p className="credit-developer">Developed by <span className="developer-name">Pradeep Prajapati</span></p>
            <p className="credit-guidance">Under the Guidance of <span className="developer-name">Pankaj Jain</span></p>
            <p className="credit-year">© 2026 - All Rights Reserved</p>
          </div>
        </div>

        <div className="footer__bottom">
          <p>&copy; 2026 Movies Recommendation System. All rights reserved.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal__close" onClick={() => setShowAuthModal(false)}><X size={20} /></button>
            <h2 className="modal__title">{authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>

            <div className="login-type-toggle">
              <button
                className={`toggle-btn ${loginType === 'email' ? 'toggle-btn--active' : ''}`}
                onClick={() => setLoginType('email')}
              >📧 Email</button>
              <button
                className={`toggle-btn ${loginType === 'phone' ? 'toggle-btn--active' : ''}`}
                onClick={() => setLoginType('phone')}
              >📱 Phone</button>
            </div>

            <div className="modal__form">
              {authMode === 'register' && (
                <input
                  className="modal__input"
                  type="text"
                  placeholder="Full Name"
                  value={authForm.name}
                  onChange={e => setAuthForm(p => ({ ...p, name: e.target.value }))}
                />
              )}

              {loginType === 'email' ? (
                <input
                  className="modal__input"
                  type="email"
                  placeholder="Email address"
                  value={authForm.email}
                  onChange={e => setAuthForm(p => ({ ...p, email: e.target.value }))}
                />
              ) : (
                <input
                  className="modal__input"
                  type="tel"
                  placeholder="Phone number"
                  value={authForm.phone}
                  onChange={e => setAuthForm(p => ({ ...p, phone: e.target.value }))}
                />
              )}

              <input
                className="modal__input"
                type="password"
                placeholder="Password"
                value={authForm.password}
                onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))}
              />

              {authError && <p className="modal__error">{authError}</p>}

              <button className="btn btn--primary btn--full" onClick={handleAuth}>
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>

              <p className="modal__switch">
                {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <span onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}>
                  {authMode === 'login' ? 'Sign Up' : 'Sign In'}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;import React, { useState, useEffect } from 'react';
import './App.css';
import { Sun, Moon, Play, Plus, Star, Flame, X, User, LogOut, Check, Globe, Clapperboard, Landmark, Search } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

const App = () => {
  const [theme, setTheme] = useState('dark');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredMovie, setHoveredMovie] = useState(null);
  const [activeCategory, setActiveCategory] = useState('trending');

  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [loginType, setLoginType] = useState('email');
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');

  // Movie state
  const [movies, setMovies] = useState({ trending: [], originals: [], popular: [], bollywood: [], hollywood: [], world: [], watchlist: [] });
  const [movieErrors, setMovieErrors] = useState({ trending: null, originals: null, popular: null, bollywood: null, hollywood: null, world: null, watchlist: null });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');

  // Genre state - list of {id, name} from TMDB, plus which genre (if any) is active
  const [genres, setGenres] = useState([]);
  const [activeGenreId, setActiveGenreId] = useState(null);
  const [genreLoading, setGenreLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [previousCategory, setPreviousCategory] = useState('trending');

  // Load user from localStorage on start
  useEffect(() => {
    const savedUser = localStorage.getItem('mf_user');
    const savedToken = localStorage.getItem('mf_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch movies on load
  useEffect(() => {
    fetchMovies();
    fetchGenres();
  }, []);

  // Fetch watchlist when user logs in
  useEffect(() => {
    if (user && token) fetchWatchlist();
  }, [user, token]);

  // Fetches one category, updates its movies on success or its error on failure.
  // Fetching each category independently (instead of one Promise.all) means one
  // broken category (e.g. a bad TMDB key) doesn't hide the others.
  const fetchCategory = async (category, endpoint) => {
    try {
      const res = await fetch(`${API}/movies/${endpoint}`);
      const data = await res.json();

      if (!res.ok) {
        // Backend responded, but with an error (bad/expired TMDB key, rate limit, etc.)
        setMovieErrors(prev => ({ ...prev, [category]: data.message || 'Failed to load movies' }));
        setMovies(prev => ({ ...prev, [category]: [] }));
        return;
      }

      const list = Array.isArray(data) ? data : (data.results || []);
      setMovies(prev => ({ ...prev, [category]: list }));
      setMovieErrors(prev => ({ ...prev, [category]: null }));
    } catch (err) {
      // Network-level failure - backend isn't reachable at all
      console.error(`Failed to fetch ${category}:`, err);
      setMovieErrors(prev => ({ ...prev, [category]: 'Cannot reach the backend. Make sure it is running on port 5000.' }));
      setMovies(prev => ({ ...prev, [category]: [] }));
    }
  };

  const fetchMovies = async () => {
    setLoading(true);
    await Promise.all([
      fetchCategory('trending', 'trending'),
      fetchCategory('originals', 'originals'),
      fetchCategory('popular', 'popular'),
      fetchCategory('bollywood', 'bollywood'),
      fetchCategory('hollywood', 'hollywood'),
      fetchCategory('world', 'world'),
    ]);
    setLoading(false);
  };

  const fetchGenres = async () => {
    try {
      const res = await fetch(`${API}/movies/genres`);
      const data = await res.json();
      if (res.ok) setGenres(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch genres:', err);
    }
  };

  // Clicking a genre pill (Action, Comedy, Drama, etc.) loads movies for that
  // genre into their own category slot ("genre_<id>") and switches to it, so
  // switching back to Trending/Popular/etc. still shows their cached results.
  const selectGenre = async (genre) => {
    setActiveGenreId(genre.id);
    setIsSearching(false);
    setSearchQuery('');
    const categoryKey = `genre_${genre.id}`;
    setActiveCategory(categoryKey);

    const alreadyLoaded = movies[categoryKey] !== undefined && !movieErrors[categoryKey];
    if (alreadyLoaded) return; // loaded successfully before, no need to refetch

    setGenreLoading(true);
    await fetchCategory(categoryKey, `genre/${genre.id}`);
    setGenreLoading(false);
  };

  const clearGenre = (categoryId) => {
    setActiveGenreId(null);
    setIsSearching(false);
    setSearchQuery('');
    setActiveCategory(categoryId);
  };

  // Runs a title search against the backend, which proxies TMDB's
  // /search/movie endpoint. Results live in their own "search" category slot,
  // and switching away simply returns to whatever tab was active before.
  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    if (!isSearching) setPreviousCategory(activeCategory);
    setActiveGenreId(null);
    setIsSearching(true);
    setActiveCategory('search');
    setSearchLoading(true);
    await fetchCategory('search', `search?query=${encodeURIComponent(q)}`);
    setSearchLoading(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setActiveCategory(previousCategory);
  };

  const fetchWatchlist = async () => {
    try {
      const res = await fetch(`${API}/watchlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) {
        setMovieErrors(prev => ({ ...prev, watchlist: data.message || 'Failed to load watchlist' }));
        return;
      }

      const watchlist = Array.isArray(data) ? data : (data.results || []);
      setMovies(prev => ({ ...prev, watchlist }));
      setMovieErrors(prev => ({ ...prev, watchlist: null }));
    } catch (err) {
      console.error('Failed to fetch watchlist:', err);
      setMovieErrors(prev => ({ ...prev, watchlist: 'Cannot reach the backend. Make sure it is running on port 5000.' }));
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const showNotif = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleAuth = async () => {
    setAuthError('');
    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
    const body = {
      ...(authMode === 'register' && { name: authForm.name }),
      ...(loginType === 'email' ? { email: authForm.email } : { phone: authForm.phone }),
      password: authForm.password
    };

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.message); return; }

      localStorage.setItem('mf_token', data.token);
      localStorage.setItem('mf_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setShowAuthModal(false);
      setAuthForm({ name: '', email: '', phone: '', password: '' });
      showNotif(`Welcome ${data.user.name || 'back'}! 🎬`);
    } catch {
      setAuthError('Server error. Make sure backend is running on port 5000.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mf_token');
    localStorage.removeItem('mf_user');
    setUser(null);
    setToken('');
    setMovies(prev => ({ ...prev, watchlist: [] }));
    showNotif('Logged out successfully');
  };

  const handleWatchlist = async (movie) => {
    if (!user) { setShowAuthModal(true); return; }
    const inWatchlist = movies.watchlist.some(m => m.id === movie.id);
    try {
      const res = await fetch(`${API}/watchlist/${movie.id}`, {
        method: inWatchlist ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (inWatchlist) {
          setMovies(prev => ({ ...prev, watchlist: prev.watchlist.filter(m => m.id !== movie.id) }));
          showNotif('Removed from watchlist');
        } else {
          setMovies(prev => ({ ...prev, watchlist: [...prev.watchlist, movie] }));
          showNotif('Added to watchlist ✅');
        }
      } else {
        showNotif(data.message || 'Could not update watchlist');
      }
    } catch {
      showNotif('Cannot reach the backend. Make sure it is running on port 5000.');
    }
  };

  const categories = [
    { id: 'trending', label: 'Trending Now', icon: Flame },
    { id: 'originals', label: 'Originals', icon: Star },
    { id: 'popular', label: 'Popular', icon: Play },
    { id: 'bollywood', label: 'Bollywood', icon: Landmark },
    { id: 'hollywood', label: 'Hollywood', icon: Clapperboard },
    { id: 'world', label: 'World Cinema', icon: Globe },
    { id: 'watchlist', label: 'Watchlist', icon: Plus },
  ];

  const currentMovies = movies[activeCategory] || [];

  return (
    <div className={`app app--${theme}`}>

      {/* Notification Toast */}
      {notification && (
        <div className="notification">{notification}</div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header__left">
          <div className="logo">
            <span className="logo__text">Movies Recommendation System</span>
          </div>

          <form className="search-bar" onSubmit={handleSearch}>
            <Search size={18} className="search-bar__icon" />
            <input
              type="text"
              className="search-bar__input"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-bar__clear"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </form>
        </div>

        <div className="header__right">
          <div className="clock">
            <div className="clock__time">{formatTime(currentTime)}</div>
            <div className="clock__date">{formatDate(currentTime)}</div>
          </div>

          {/* Login/User Button */}
          {user ? (
            <div className="user-menu">
              <div className="user-info">
                <User size={18} />
                <span>{user.name || user.email || user.phone}</span>
              </div>
              <button className="logout-btn" onClick={handleLogout} title="Logout">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button className="login-btn" onClick={() => setShowAuthModal(true)}>
              <User size={18} /> Sign In
            </button>
          )}

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero__content">
          <h1 className="hero__title">{user ? `Welcome, ${user.name || 'Movie Lover'}!` : 'Welcome Back'}</h1>
          <p className="hero__subtitle">Discover your next favorite movie</p>
          <div className="hero__actions">
            <button className="btn btn--primary">
              <Play size={20} /> Start Watching
            </button>
            <button className="btn btn--secondary" onClick={() => !user && setShowAuthModal(true)}>
              <Plus size={20} /> Add to List
            </button>
          </div>
        </div>
        <div className="hero__decoration"></div>
      </section>

      {/* Category Navigation */}
      <nav className="categories">
        {categories.map((cat) => {
          const IconComponent = cat.icon;
          return (
            <button
              key={cat.id}
              className={`category-btn ${activeCategory === cat.id ? 'category-btn--active' : ''}`}
              onClick={() => clearGenre(cat.id)}
            >
              <IconComponent size={20} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Genre Filter */}
      {genres.length > 0 && (
        <nav className="categories categories--genres">
          {genres.map((genre) => (
            <button
              key={genre.id}
              className={`category-btn category-btn--genre ${activeGenreId === genre.id ? 'category-btn--active' : ''}`}
              onClick={() => selectGenre(genre)}
            >
              <span>{genre.name}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Movies Grid */}
      <section className="content">
        {isSearching ? (
          <h2 className="content__heading">
            Search results for "{searchQuery}"
          </h2>
        ) : activeGenreId && (
          <h2 className="content__heading">
            {genres.find(g => g.id === activeGenreId)?.name} Movies
          </h2>
        )}
        {(isSearching && searchLoading) || (loading && activeCategory !== 'watchlist' && !activeGenreId && !isSearching) || (activeGenreId && genreLoading) ? (
          <div className="loading">
            <div className="loading__spinner"></div>
            <p>Loading movies...</p>
          </div>
        ) : movieErrors[activeCategory] ? (
          <div className="empty-state">
            <p>⚠️ {movieErrors[activeCategory]}</p>
            <button
              className="btn btn--primary"
              style={{ marginTop: '12px' }}
              onClick={() => {
                if (isSearching) handleSearch({ preventDefault: () => {} });
                else if (activeCategory === 'watchlist') fetchWatchlist();
                else if (activeGenreId) selectGenre({ id: activeGenreId, name: genres.find(g => g.id === activeGenreId)?.name });
                else fetchMovies();
              }}
            >
              Try Again
            </button>
          </div>
        ) : currentMovies.length === 0 ? (
          <div className="empty-state">
            {activeCategory === 'watchlist' ? (
              <>
                <p>Your watchlist is empty.</p>
                <p>{user ? 'Click + on any movie to add it!' : 'Sign in to save movies to your watchlist.'}</p>
                {!user && <button className="btn btn--primary" style={{marginTop:'12px'}} onClick={() => setShowAuthModal(true)}>Sign In</button>}
              </>
            ) : (
              <p>No movies found.</p>
            )}
          </div>
        ) : (
          <div className="movies-grid">
            {currentMovies.map((movie) => {
              const inWatchlist = movies.watchlist.some(m => m.id === movie.id);
              const posterUrl = movie.poster_path ? `${TMDB_IMG}${movie.poster_path}` : null;
              return (
                <div
                  key={movie.id}
                  className="movie-card"
                  onMouseEnter={() => setHoveredMovie(movie.id)}
                  onMouseLeave={() => setHoveredMovie(null)}
                >
                  <div
                    className="movie-card__image"
                    style={!posterUrl ? { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' } : {}}
                  >
                    {posterUrl && <img src={posterUrl} alt={movie.title} loading="lazy" />}
                    <div className="movie-card__overlay">
                      <div className="movie-card__actions">
                        <button className="action-btn action-btn--play" title="Play">
                          <Play size={24} />
                        </button>
                        <button
                          className={`action-btn ${inWatchlist ? 'action-btn--added' : 'action-btn--add'}`}
                          title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                          onClick={(e) => { e.stopPropagation(); handleWatchlist(movie); }}
                        >
                          {inWatchlist ? <Check size={24} /> : <Plus size={24} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="movie-card__info">
                    <h3 className="movie-card__title">{movie.title}</h3>
                    <div className="movie-card__meta">
                      <div className="movie-card__rating">
                        <Star size={16} />
                        <span>{movie.vote_average ? movie.vote_average.toFixed(1) : movie.rating}</span>
                      </div>
                      <span className="movie-card__genre">
                        {movie.genre || (movie.genre_ids && genres.find(g => g.id === movie.genre_ids[0])?.name) || ''}
                      </span>
                      <span className="movie-card__year">{movie.release_date ? movie.release_date.slice(0, 4) : movie.year}</span>
                    </div>
                  </div>

                  {hoveredMovie === movie.id && (
                    <div className="movie-card__expanded">
                      <p className="movie-card__description">
                        {movie.overview ? movie.overview.slice(0, 100) + '...' : 'Experience an unforgettable journey into a world of wonder, mystery, and intrigue.'}
                      </p>
                      <div className="movie-card__expanded-actions">
                        <button className="btn btn--small btn--primary">Play Now</button>
                        <button className="btn btn--small btn--secondary" onClick={() => handleWatchlist(movie)}>
                          {inWatchlist ? 'Remove' : '+ Watchlist'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer__content">
          <div className="footer__section">
            <h4>About Movies Recommendation System</h4>
            <p>Your ultimate streaming destination for movies, series, and more.</p>
          </div>
          <div className="footer__section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#browse">Browse</a></li>
              <li><a href="#help">Help</a></li>
            </ul>
          </div>
          <div className="footer__section">
            <h4>Legal</h4>
            <ul>
              <li><a href="#terms">Terms of Use</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#cookies">Cookie Settings</a></li>
            </ul>
          </div>
        </div>

        {/* Developer Credit Section */}
        <div className="footer__divider"></div>
        <div className="footer__credit">
          <div className="credit-container">
            <h2 className="credit-title">🎬 Movies Recommendation System</h2>
            <p className="credit-developer">Developed by <span className="developer-name">Pradeep Prajapati</span></p>
            <p className="credit-guidance">Under the Guidance of <span className="developer-name">Pankaj Jain</span></p>
            <p className="credit-year">© 2026 - All Rights Reserved</p>
          </div>
        </div>

        <div className="footer__bottom">
          <p>&copy; 2026 Movies Recommendation System. All rights reserved.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal__close" onClick={() => setShowAuthModal(false)}><X size={20} /></button>
            <h2 className="modal__title">{authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>

            <div className="login-type-toggle">
              <button
                className={`toggle-btn ${loginType === 'email' ? 'toggle-btn--active' : ''}`}
                onClick={() => setLoginType('email')}
              >📧 Email</button>
              <button
                className={`toggle-btn ${loginType === 'phone' ? 'toggle-btn--active' : ''}`}
                onClick={() => setLoginType('phone')}
              >📱 Phone</button>
            </div>

            <div className="modal__form">
              {authMode === 'register' && (
                <input
                  className="modal__input"
                  type="text"
                  placeholder="Full Name"
                  value={authForm.name}
                  onChange={e => setAuthForm(p => ({ ...p, name: e.target.value }))}
                />
              )}

              {loginType === 'email' ? (
                <input
                  className="modal__input"
                  type="email"
                  placeholder="Email address"
                  value={authForm.email}
                  onChange={e => setAuthForm(p => ({ ...p, email: e.target.value }))}
                />
              ) : (
                <input
                  className="modal__input"
                  type="tel"
                  placeholder="Phone number"
                  value={authForm.phone}
                  onChange={e => setAuthForm(p => ({ ...p, phone: e.target.value }))}
                />
              )}

              <input
                className="modal__input"
                type="password"
                placeholder="Password"
                value={authForm.password}
                onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))}
              />

              {authError && <p className="modal__error">{authError}</p>}

              <button className="btn btn--primary btn--full" onClick={handleAuth}>
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>

              <p className="modal__switch">
                {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <span onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}>
                  {authMode === 'login' ? 'Sign Up' : 'Sign In'}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;import React, { useState, useEffect } from 'react';
import './App.css';
import { Sun, Moon, Play, Plus, Star, Flame, X, User, LogOut, Check, Globe, Clapperboard, Landmark, Search } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

const App = () => {
  const [theme, setTheme] = useState('dark');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredMovie, setHoveredMovie] = useState(null);
  const [activeCategory, setActiveCategory] = useState('trending');

  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [loginType, setLoginType] = useState('email');
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');

  // Movie state
  const [movies, setMovies] = useState({ trending: [], originals: [], popular: [], bollywood: [], hollywood: [], world: [], watchlist: [] });
  const [movieErrors, setMovieErrors] = useState({ trending: null, originals: null, popular: null, bollywood: null, hollywood: null, world: null, watchlist: null });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');

  // Genre state - list of {id, name} from TMDB, plus which genre (if any) is active
  const [genres, setGenres] = useState([]);
  const [activeGenreId, setActiveGenreId] = useState(null);
  const [genreLoading, setGenreLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [previousCategory, setPreviousCategory] = useState('trending');

  // Load user from localStorage on start
  useEffect(() => {
    const savedUser = localStorage.getItem('mf_user');
    const savedToken = localStorage.getItem('mf_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch movies on load
  useEffect(() => {
    fetchMovies();
    fetchGenres();
  }, []);

  // Fetch watchlist when user logs in
  useEffect(() => {
    if (user && token) fetchWatchlist();
  }, [user, token]);

  // Fetches one category, updates its movies on success or its error on failure.
  // Fetching each category independently (instead of one Promise.all) means one
  // broken category (e.g. a bad TMDB key) doesn't hide the others.
  const fetchCategory = async (category, endpoint) => {
    try {
      const res = await fetch(`${API}/movies/${endpoint}`);
      const data = await res.json();

      if (!res.ok) {
        // Backend responded, but with an error (bad/expired TMDB key, rate limit, etc.)
        setMovieErrors(prev => ({ ...prev, [category]: data.message || 'Failed to load movies' }));
        setMovies(prev => ({ ...prev, [category]: [] }));
        return;
      }

      const list = Array.isArray(data) ? data : (data.results || []);
      setMovies(prev => ({ ...prev, [category]: list }));
      setMovieErrors(prev => ({ ...prev, [category]: null }));
    } catch (err) {
      // Network-level failure - backend isn't reachable at all
      console.error(`Failed to fetch ${category}:`, err);
      setMovieErrors(prev => ({ ...prev, [category]: 'Cannot reach the backend. Make sure it is running on port 5000.' }));
      setMovies(prev => ({ ...prev, [category]: [] }));
    }
  };

  const fetchMovies = async () => {
    setLoading(true);
    await Promise.all([
      fetchCategory('trending', 'trending'),
      fetchCategory('originals', 'originals'),
      fetchCategory('popular', 'popular'),
      fetchCategory('bollywood', 'bollywood'),
      fetchCategory('hollywood', 'hollywood'),
      fetchCategory('world', 'world'),
    ]);
    setLoading(false);
  };

  const fetchGenres = async () => {
    try {
      const res = await fetch(`${API}/movies/genres`);
      const data = await res.json();
      if (res.ok) setGenres(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch genres:', err);
    }
  };

  // Clicking a genre pill (Action, Comedy, Drama, etc.) loads movies for that
  // genre into their own category slot ("genre_<id>") and switches to it, so
  // switching back to Trending/Popular/etc. still shows their cached results.
  const selectGenre = async (genre) => {
    setActiveGenreId(genre.id);
    setIsSearching(false);
    setSearchQuery('');
    const categoryKey = `genre_${genre.id}`;
    setActiveCategory(categoryKey);

    const alreadyLoaded = movies[categoryKey] !== undefined && !movieErrors[categoryKey];
    if (alreadyLoaded) return; // loaded successfully before, no need to refetch

    setGenreLoading(true);
    await fetchCategory(categoryKey, `genre/${genre.id}`);
    setGenreLoading(false);
  };

  const clearGenre = (categoryId) => {
    setActiveGenreId(null);
    setIsSearching(false);
    setSearchQuery('');
    setActiveCategory(categoryId);
  };

  // Runs a title search against the backend, which proxies TMDB's
  // /search/movie endpoint. Results live in their own "search" category slot,
  // and switching away simply returns to whatever tab was active before.
  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    if (!isSearching) setPreviousCategory(activeCategory);
    setActiveGenreId(null);
    setIsSearching(true);
    setActiveCategory('search');
    setSearchLoading(true);
    await fetchCategory('search', `search?query=${encodeURIComponent(q)}`);
    setSearchLoading(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setActiveCategory(previousCategory);
  };

  const fetchWatchlist = async () => {
    try {
      const res = await fetch(`${API}/watchlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) {
        setMovieErrors(prev => ({ ...prev, watchlist: data.message || 'Failed to load watchlist' }));
        return;
      }

      const watchlist = Array.isArray(data) ? data : (data.results || []);
      setMovies(prev => ({ ...prev, watchlist }));
      setMovieErrors(prev => ({ ...prev, watchlist: null }));
    } catch (err) {
      console.error('Failed to fetch watchlist:', err);
      setMovieErrors(prev => ({ ...prev, watchlist: 'Cannot reach the backend. Make sure it is running on port 5000.' }));
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const showNotif = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleAuth = async () => {
    setAuthError('');
    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
    const body = {
      ...(authMode === 'register' && { name: authForm.name }),
      ...(loginType === 'email' ? { email: authForm.email } : { phone: authForm.phone }),
      password: authForm.password
    };

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.message); return; }

      localStorage.setItem('mf_token', data.token);
      localStorage.setItem('mf_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setShowAuthModal(false);
      setAuthForm({ name: '', email: '', phone: '', password: '' });
      showNotif(`Welcome ${data.user.name || 'back'}! 🎬`);
    } catch {
      setAuthError('Server error. Make sure backend is running on port 5000.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mf_token');
    localStorage.removeItem('mf_user');
    setUser(null);
    setToken('');
    setMovies(prev => ({ ...prev, watchlist: [] }));
    showNotif('Logged out successfully');
  };

  const handleWatchlist = async (movie) => {
    if (!user) { setShowAuthModal(true); return; }
    const inWatchlist = movies.watchlist.some(m => m.id === movie.id);
    try {
      const res = await fetch(`${API}/watchlist/${movie.id}`, {
        method: inWatchlist ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (inWatchlist) {
          setMovies(prev => ({ ...prev, watchlist: prev.watchlist.filter(m => m.id !== movie.id) }));
          showNotif('Removed from watchlist');
        } else {
          setMovies(prev => ({ ...prev, watchlist: [...prev.watchlist, movie] }));
          showNotif('Added to watchlist ✅');
        }
      } else {
        showNotif(data.message || 'Could not update watchlist');
      }
    } catch {
      showNotif('Cannot reach the backend. Make sure it is running on port 5000.');
    }
  };

  const categories = [
    { id: 'trending', label: 'Trending Now', icon: Flame },
    { id: 'originals', label: 'Originals', icon: Star },
    { id: 'popular', label: 'Popular', icon: Play },
    { id: 'bollywood', label: 'Bollywood', icon: Landmark },
    { id: 'hollywood', label: 'Hollywood', icon: Clapperboard },
    { id: 'world', label: 'World Cinema', icon: Globe },
    { id: 'watchlist', label: 'Watchlist', icon: Plus },
  ];

  const currentMovies = movies[activeCategory] || [];

  return (
    <div className={`app app--${theme}`}>

      {/* Notification Toast */}
      {notification && (
        <div className="notification">{notification}</div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header__left">
          <div className="logo">
            <span className="logo__text">Movies Recommendation System</span>
          </div>

          <form className="search-bar" onSubmit={handleSearch}>
            <Search size={18} className="search-bar__icon" />
            <input
              type="text"
              className="search-bar__input"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-bar__clear"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </form>
        </div>

        <div className="header__right">
          <div className="clock">
            <div className="clock__time">{formatTime(currentTime)}</div>
            <div className="clock__date">{formatDate(currentTime)}</div>
          </div>

          {/* Login/User Button */}
          {user ? (
            <div className="user-menu">
              <div className="user-info">
                <User size={18} />
                <span>{user.name || user.email || user.phone}</span>
              </div>
              <button className="logout-btn" onClick={handleLogout} title="Logout">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button className="login-btn" onClick={() => setShowAuthModal(true)}>
              <User size={18} /> Sign In
            </button>
          )}

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero__content">
          <h1 className="hero__title">{user ? `Welcome, ${user.name || 'Movie Lover'}!` : 'Welcome Back'}</h1>
          <p className="hero__subtitle">Discover your next favorite movie</p>
          <div className="hero__actions">
            <button className="btn btn--primary">
              <Play size={20} /> Start Watching
            </button>
            <button className="btn btn--secondary" onClick={() => !user && setShowAuthModal(true)}>
              <Plus size={20} /> Add to List
            </button>
          </div>
        </div>
        <div className="hero__decoration"></div>
      </section>

      {/* Category Navigation */}
      <nav className="categories">
        {categories.map((cat) => {
          const IconComponent = cat.icon;
          return (
            <button
              key={cat.id}
              className={`category-btn ${activeCategory === cat.id ? 'category-btn--active' : ''}`}
              onClick={() => clearGenre(cat.id)}
            >
              <IconComponent size={20} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Genre Filter */}
      {genres.length > 0 && (
        <nav className="categories categories--genres">
          {genres.map((genre) => (
            <button
              key={genre.id}
              className={`category-btn category-btn--genre ${activeGenreId === genre.id ? 'category-btn--active' : ''}`}
              onClick={() => selectGenre(genre)}
            >
              <span>{genre.name}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Movies Grid */}
      <section className="content">
        {isSearching ? (
          <h2 className="content__heading">
            Search results for "{searchQuery}"
          </h2>
        ) : activeGenreId && (
          <h2 className="content__heading">
            {genres.find(g => g.id === activeGenreId)?.name} Movies
          </h2>
        )}
        {(isSearching && searchLoading) || (loading && activeCategory !== 'watchlist' && !activeGenreId && !isSearching) || (activeGenreId && genreLoading) ? (
          <div className="loading">
            <div className="loading__spinner"></div>
            <p>Loading movies...</p>
          </div>
        ) : movieErrors[activeCategory] ? (
          <div className="empty-state">
            <p>⚠️ {movieErrors[activeCategory]}</p>
            <button
              className="btn btn--primary"
              style={{ marginTop: '12px' }}
              onClick={() => {
                if (isSearching) handleSearch({ preventDefault: () => {} });
                else if (activeCategory === 'watchlist') fetchWatchlist();
                else if (activeGenreId) selectGenre({ id: activeGenreId, name: genres.find(g => g.id === activeGenreId)?.name });
                else fetchMovies();
              }}
            >
              Try Again
            </button>
          </div>
        ) : currentMovies.length === 0 ? (
          <div className="empty-state">
            {activeCategory === 'watchlist' ? (
              <>
                <p>Your watchlist is empty.</p>
                <p>{user ? 'Click + on any movie to add it!' : 'Sign in to save movies to your watchlist.'}</p>
                {!user && <button className="btn btn--primary" style={{marginTop:'12px'}} onClick={() => setShowAuthModal(true)}>Sign In</button>}
              </>
            ) : (
              <p>No movies found.</p>
            )}
          </div>
        ) : (
          <div className="movies-grid">
            {currentMovies.map((movie) => {
              const inWatchlist = movies.watchlist.some(m => m.id === movie.id);
              const posterUrl = movie.poster_path ? `${TMDB_IMG}${movie.poster_path}` : null;
              return (
                <div
                  key={movie.id}
                  className="movie-card"
                  onMouseEnter={() => setHoveredMovie(movie.id)}
                  onMouseLeave={() => setHoveredMovie(null)}
                >
                  <div
                    className="movie-card__image"
                    style={!posterUrl ? { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' } : {}}
                  >
                    {posterUrl && <img src={posterUrl} alt={movie.title} loading="lazy" />}
                    <div className="movie-card__overlay">
                      <div className="movie-card__actions">
                        <button className="action-btn action-btn--play" title="Play">
                          <Play size={24} />
                        </button>
                        <button
                          className={`action-btn ${inWatchlist ? 'action-btn--added' : 'action-btn--add'}`}
                          title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                          onClick={(e) => { e.stopPropagation(); handleWatchlist(movie); }}
                        >
                          {inWatchlist ? <Check size={24} /> : <Plus size={24} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="movie-card__info">
                    <h3 className="movie-card__title">{movie.title}</h3>
                    <div className="movie-card__meta">
                      <div className="movie-card__rating">
                        <Star size={16} />
                        <span>{movie.vote_average ? movie.vote_average.toFixed(1) : movie.rating}</span>
                      </div>
                      <span className="movie-card__genre">
                        {movie.genre || (movie.genre_ids && genres.find(g => g.id === movie.genre_ids[0])?.name) || ''}
                      </span>
                      <span className="movie-card__year">{movie.release_date ? movie.release_date.slice(0, 4) : movie.year}</span>
                    </div>
                  </div>

                  {hoveredMovie === movie.id && (
                    <div className="movie-card__expanded">
                      <p className="movie-card__description">
                        {movie.overview ? movie.overview.slice(0, 100) + '...' : 'Experience an unforgettable journey into a world of wonder, mystery, and intrigue.'}
                      </p>
                      <div className="movie-card__expanded-actions">
                        <button className="btn btn--small btn--primary">Play Now</button>
                        <button className="btn btn--small btn--secondary" onClick={() => handleWatchlist(movie)}>
                          {inWatchlist ? 'Remove' : '+ Watchlist'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer__content">
          <div className="footer__section">
            <h4>About Movies Recommendation System</h4>
            <p>Your ultimate streaming destination for movies, series, and more.</p>
          </div>
          <div className="footer__section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#browse">Browse</a></li>
              <li><a href="#help">Help</a></li>
            </ul>
          </div>
          <div className="footer__section">
            <h4>Legal</h4>
            <ul>
              <li><a href="#terms">Terms of Use</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#cookies">Cookie Settings</a></li>
            </ul>
          </div>
        </div>

        {/* Developer Credit Section */}
        <div className="footer__divider"></div>
        <div className="footer__credit">
          <div className="credit-container">
            <h2 className="credit-title">🎬 Movies Recommendation System</h2>
            <p className="credit-developer">Developed by <span className="developer-name">Pradeep Prajapati</span></p>
            <p className="credit-guidance">Under the Guidance of <span className="developer-name">Pankaj Jain</span></p>
            <p className="credit-year">© 2026 - All Rights Reserved</p>
          </div>
        </div>

        <div className="footer__bottom">
          <p>&copy; 2026 Movies Recommendation System. All rights reserved.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal__close" onClick={() => setShowAuthModal(false)}><X size={20} /></button>
            <h2 className="modal__title">{authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>

            <div className="login-type-toggle">
              <button
                className={`toggle-btn ${loginType === 'email' ? 'toggle-btn--active' : ''}`}
                onClick={() => setLoginType('email')}
              >📧 Email</button>
              <button
                className={`toggle-btn ${loginType === 'phone' ? 'toggle-btn--active' : ''}`}
                onClick={() => setLoginType('phone')}
              >📱 Phone</button>
            </div>

            <div className="modal__form">
              {authMode === 'register' && (
                <input
                  className="modal__input"
                  type="text"
                  placeholder="Full Name"
                  value={authForm.name}
                  onChange={e => setAuthForm(p => ({ ...p, name: e.target.value }))}
                />
              )}

              {loginType === 'email' ? (
                <input
                  className="modal__input"
                  type="email"
                  placeholder="Email address"
                  value={authForm.email}
                  onChange={e => setAuthForm(p => ({ ...p, email: e.target.value }))}
                />
              ) : (
                <input
                  className="modal__input"
                  type="tel"
                  placeholder="Phone number"
                  value={authForm.phone}
                  onChange={e => setAuthForm(p => ({ ...p, phone: e.target.value }))}
                />
              )}

              <input
                className="modal__input"
                type="password"
                placeholder="Password"
                value={authForm.password}
                onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))}
              />

              {authError && <p className="modal__error">{authError}</p>}

              <button className="btn btn--primary btn--full" onClick={handleAuth}>
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>

              <p className="modal__switch">
                {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <span onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}>
                  {authMode === 'login' ? 'Sign Up' : 'Sign In'}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;import React, { useState, useEffect } from 'react';
import './App.css';
import { Sun, Moon, Play, Plus, Star, Flame, X, User, LogOut, Check, Globe, Clapperboard, Landmark, Search } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

const App = () => {
  const [theme, setTheme] = useState('dark');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredMovie, setHoveredMovie] = useState(null);
  const [activeCategory, setActiveCategory] = useState('trending');

  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [loginType, setLoginType] = useState('email');
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');

  // Movie state
  const [movies, setMovies] = useState({ trending: [], originals: [], popular: [], bollywood: [], hollywood: [], world: [], watchlist: [] });
  const [movieErrors, setMovieErrors] = useState({ trending: null, originals: null, popular: null, bollywood: null, hollywood: null, world: null, watchlist: null });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');

  // Genre state - list of {id, name} from TMDB, plus which genre (if any) is active
  const [genres, setGenres] = useState([]);
  const [activeGenreId, setActiveGenreId] = useState(null);
  const [genreLoading, setGenreLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [previousCategory, setPreviousCategory] = useState('trending');

  // Load user from localStorage on start
  useEffect(() => {
    const savedUser = localStorage.getItem('mf_user');
    const savedToken = localStorage.getItem('mf_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch movies on load
  useEffect(() => {
    fetchMovies();
    fetchGenres();
  }, []);

  // Fetch watchlist when user logs in
  useEffect(() => {
    if (user && token) fetchWatchlist();
  }, [user, token]);

  // Fetches one category, updates its movies on success or its error on failure.
  // Fetching each category independently (instead of one Promise.all) means one
  // broken category (e.g. a bad TMDB key) doesn't hide the others.
  const fetchCategory = async (category, endpoint) => {
    try {
      const res = await fetch(`${API}/movies/${endpoint}`);
      const data = await res.json();

      if (!res.ok) {
        // Backend responded, but with an error (bad/expired TMDB key, rate limit, etc.)
        setMovieErrors(prev => ({ ...prev, [category]: data.message || 'Failed to load movies' }));
        setMovies(prev => ({ ...prev, [category]: [] }));
        return;
      }

      const list = Array.isArray(data) ? data : (data.results || []);
      setMovies(prev => ({ ...prev, [category]: list }));
      setMovieErrors(prev => ({ ...prev, [category]: null }));
    } catch (err) {
      // Network-level failure - backend isn't reachable at all
      console.error(`Failed to fetch ${category}:`, err);
      setMovieErrors(prev => ({ ...prev, [category]: 'Cannot reach the backend. Make sure it is running on port 5000.' }));
      setMovies(prev => ({ ...prev, [category]: [] }));
    }
  };

  const fetchMovies = async () => {
    setLoading(true);
    await Promise.all([
      fetchCategory('trending', 'trending'),
      fetchCategory('originals', 'originals'),
      fetchCategory('popular', 'popular'),
      fetchCategory('bollywood', 'bollywood'),
      fetchCategory('hollywood', 'hollywood'),
      fetchCategory('world', 'world'),
    ]);
    setLoading(false);
  };

  const fetchGenres = async () => {
    try {
      const res = await fetch(`${API}/movies/genres`);
      const data = await res.json();
      if (res.ok) setGenres(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch genres:', err);
    }
  };

  // Clicking a genre pill (Action, Comedy, Drama, etc.) loads movies for that
  // genre into their own category slot ("genre_<id>") and switches to it, so
  // switching back to Trending/Popular/etc. still shows their cached results.
  const selectGenre = async (genre) => {
    setActiveGenreId(genre.id);
    setIsSearching(false);
    setSearchQuery('');
    const categoryKey = `genre_${genre.id}`;
    setActiveCategory(categoryKey);

    const alreadyLoaded = movies[categoryKey] !== undefined && !movieErrors[categoryKey];
    if (alreadyLoaded) return; // loaded successfully before, no need to refetch

    setGenreLoading(true);
    await fetchCategory(categoryKey, `genre/${genre.id}`);
    setGenreLoading(false);
  };

  const clearGenre = (categoryId) => {
    setActiveGenreId(null);
    setIsSearching(false);
    setSearchQuery('');
    setActiveCategory(categoryId);
  };

  // Runs a title search against the backend, which proxies TMDB's
  // /search/movie endpoint. Results live in their own "search" category slot,
  // and switching away simply returns to whatever tab was active before.
  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    if (!isSearching) setPreviousCategory(activeCategory);
    setActiveGenreId(null);
    setIsSearching(true);
    setActiveCategory('search');
    setSearchLoading(true);
    await fetchCategory('search', `search?query=${encodeURIComponent(q)}`);
    setSearchLoading(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setActiveCategory(previousCategory);
  };

  const fetchWatchlist = async () => {
    try {
      const res = await fetch(`${API}/watchlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) {
        setMovieErrors(prev => ({ ...prev, watchlist: data.message || 'Failed to load watchlist' }));
        return;
      }

      const watchlist = Array.isArray(data) ? data : (data.results || []);
      setMovies(prev => ({ ...prev, watchlist }));
      setMovieErrors(prev => ({ ...prev, watchlist: null }));
    } catch (err) {
      console.error('Failed to fetch watchlist:', err);
      setMovieErrors(prev => ({ ...prev, watchlist: 'Cannot reach the backend. Make sure it is running on port 5000.' }));
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const showNotif = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleAuth = async () => {
    setAuthError('');
    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
    const body = {
      ...(authMode === 'register' && { name: authForm.name }),
      ...(loginType === 'email' ? { email: authForm.email } : { phone: authForm.phone }),
      password: authForm.password
    };

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.message); return; }

      localStorage.setItem('mf_token', data.token);
      localStorage.setItem('mf_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setShowAuthModal(false);
      setAuthForm({ name: '', email: '', phone: '', password: '' });
      showNotif(`Welcome ${data.user.name || 'back'}! 🎬`);
    } catch {
      setAuthError('Server error. Make sure backend is running on port 5000.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mf_token');
    localStorage.removeItem('mf_user');
    setUser(null);
    setToken('');
    setMovies(prev => ({ ...prev, watchlist: [] }));
    showNotif('Logged out successfully');
  };

  const handleWatchlist = async (movie) => {
    if (!user) { setShowAuthModal(true); return; }
    const inWatchlist = movies.watchlist.some(m => m.id === movie.id);
    try {
      const res = await fetch(`${API}/watchlist/${movie.id}`, {
        method: inWatchlist ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (inWatchlist) {
          setMovies(prev => ({ ...prev, watchlist: prev.watchlist.filter(m => m.id !== movie.id) }));
          showNotif('Removed from watchlist');
        } else {
          setMovies(prev => ({ ...prev, watchlist: [...prev.watchlist, movie] }));
          showNotif('Added to watchlist ✅');
        }
      } else {
        showNotif(data.message || 'Could not update watchlist');
      }
    } catch {
      showNotif('Cannot reach the backend. Make sure it is running on port 5000.');
    }
  };

  const categories = [
    { id: 'trending', label: 'Trending Now', icon: Flame },
    { id: 'originals', label: 'Originals', icon: Star },
    { id: 'popular', label: 'Popular', icon: Play },
    { id: 'bollywood', label: 'Bollywood', icon: Landmark },
    { id: 'hollywood', label: 'Hollywood', icon: Clapperboard },
    { id: 'world', label: 'World Cinema', icon: Globe },
    { id: 'watchlist', label: 'Watchlist', icon: Plus },
  ];

  const currentMovies = movies[activeCategory] || [];

  return (
    <div className={`app app--${theme}`}>

      {/* Notification Toast */}
      {notification && (
        <div className="notification">{notification}</div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header__left">
          <div className="logo">
            <span className="logo__text">Movies Recommendation System</span>
          </div>

          <form className="search-bar" onSubmit={handleSearch}>
            <Search size={18} className="search-bar__icon" />
            <input
              type="text"
              className="search-bar__input"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-bar__clear"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </form>
        </div>

        <div className="header__right">
          <div className="clock">
            <div className="clock__time">{formatTime(currentTime)}</div>
            <div className="clock__date">{formatDate(currentTime)}</div>
          </div>

          {/* Login/User Button */}
          {user ? (
            <div className="user-menu">
              <div className="user-info">
                <User size={18} />
                <span>{user.name || user.email || user.phone}</span>
              </div>
              <button className="logout-btn" onClick={handleLogout} title="Logout">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button className="login-btn" onClick={() => setShowAuthModal(true)}>
              <User size={18} /> Sign In
            </button>
          )}

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero__content">
          <h1 className="hero__title">{user ? `Welcome, ${user.name || 'Movie Lover'}!` : 'Welcome Back'}</h1>
          <p className="hero__subtitle">Discover your next favorite movie</p>
          <div className="hero__actions">
            <button className="btn btn--primary">
              <Play size={20} /> Start Watching
            </button>
            <button className="btn btn--secondary" onClick={() => !user && setShowAuthModal(true)}>
              <Plus size={20} /> Add to List
            </button>
          </div>
        </div>
        <div className="hero__decoration"></div>
      </section>

      {/* Category Navigation */}
      <nav className="categories">
        {categories.map((cat) => {
          const IconComponent = cat.icon;
          return (
            <button
              key={cat.id}
              className={`category-btn ${activeCategory === cat.id ? 'category-btn--active' : ''}`}
              onClick={() => clearGenre(cat.id)}
            >
              <IconComponent size={20} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Genre Filter */}
      {genres.length > 0 && (
        <nav className="categories categories--genres">
          {genres.map((genre) => (
            <button
              key={genre.id}
              className={`category-btn category-btn--genre ${activeGenreId === genre.id ? 'category-btn--active' : ''}`}
              onClick={() => selectGenre(genre)}
            >
              <span>{genre.name}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Movies Grid */}
      <section className="content">
        {isSearching ? (
          <h2 className="content__heading">
            Search results for "{searchQuery}"
          </h2>
        ) : activeGenreId && (
          <h2 className="content__heading">
            {genres.find(g => g.id === activeGenreId)?.name} Movies
          </h2>
        )}
        {(isSearching && searchLoading) || (loading && activeCategory !== 'watchlist' && !activeGenreId && !isSearching) || (activeGenreId && genreLoading) ? (
          <div className="loading">
            <div className="loading__spinner"></div>
            <p>Loading movies...</p>
          </div>
        ) : movieErrors[activeCategory] ? (
          <div className="empty-state">
            <p>⚠️ {movieErrors[activeCategory]}</p>
            <button
              className="btn btn--primary"
              style={{ marginTop: '12px' }}
              onClick={() => {
                if (isSearching) handleSearch({ preventDefault: () => {} });
                else if (activeCategory === 'watchlist') fetchWatchlist();
                else if (activeGenreId) selectGenre({ id: activeGenreId, name: genres.find(g => g.id === activeGenreId)?.name });
                else fetchMovies();
              }}
            >
              Try Again
            </button>
          </div>
        ) : currentMovies.length === 0 ? (
          <div className="empty-state">
            {activeCategory === 'watchlist' ? (
              <>
                <p>Your watchlist is empty.</p>
                <p>{user ? 'Click + on any movie to add it!' : 'Sign in to save movies to your watchlist.'}</p>
                {!user && <button className="btn btn--primary" style={{marginTop:'12px'}} onClick={() => setShowAuthModal(true)}>Sign In</button>}
              </>
            ) : (
              <p>No movies found.</p>
            )}
          </div>
        ) : (
          <div className="movies-grid">
            {currentMovies.map((movie) => {
              const inWatchlist = movies.watchlist.some(m => m.id === movie.id);
              const posterUrl = movie.poster_path ? `${TMDB_IMG}${movie.poster_path}` : null;
              return (
                <div
                  key={movie.id}
                  className="movie-card"
                  onMouseEnter={() => setHoveredMovie(movie.id)}
                  onMouseLeave={() => setHoveredMovie(null)}
                >
                  <div
                    className="movie-card__image"
                    style={!posterUrl ? { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' } : {}}
                  >
                    {posterUrl && <img src={posterUrl} alt={movie.title} loading="lazy" />}
                    <div className="movie-card__overlay">
                      <div className="movie-card__actions">
                        <button className="action-btn action-btn--play" title="Play">
                          <Play size={24} />
                        </button>
                        <button
                          className={`action-btn ${inWatchlist ? 'action-btn--added' : 'action-btn--add'}`}
                          title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                          onClick={(e) => { e.stopPropagation(); handleWatchlist(movie); }}
                        >
                          {inWatchlist ? <Check size={24} /> : <Plus size={24} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="movie-card__info">
                    <h3 className="movie-card__title">{movie.title}</h3>
                    <div className="movie-card__meta">
                      <div className="movie-card__rating">
                        <Star size={16} />
                        <span>{movie.vote_average ? movie.vote_average.toFixed(1) : movie.rating}</span>
                      </div>
                      <span className="movie-card__genre">
                        {movie.genre || (movie.genre_ids && genres.find(g => g.id === movie.genre_ids[0])?.name) || ''}
                      </span>
                      <span className="movie-card__year">{movie.release_date ? movie.release_date.slice(0, 4) : movie.year}</span>
                    </div>
                  </div>

                  {hoveredMovie === movie.id && (
                    <div className="movie-card__expanded">
                      <p className="movie-card__description">
                        {movie.overview ? movie.overview.slice(0, 100) + '...' : 'Experience an unforgettable journey into a world of wonder, mystery, and intrigue.'}
                      </p>
                      <div className="movie-card__expanded-actions">
                        <button className="btn btn--small btn--primary">Play Now</button>
                        <button className="btn btn--small btn--secondary" onClick={() => handleWatchlist(movie)}>
                          {inWatchlist ? 'Remove' : '+ Watchlist'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer__content">
          <div className="footer__section">
            <h4>About Movies Recommendation System</h4>
            <p>Your ultimate streaming destination for movies, series, and more.</p>
          </div>
          <div className="footer__section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#browse">Browse</a></li>
              <li><a href="#help">Help</a></li>
            </ul>
          </div>
          <div className="footer__section">
            <h4>Legal</h4>
            <ul>
              <li><a href="#terms">Terms of Use</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#cookies">Cookie Settings</a></li>
            </ul>
          </div>
        </div>

        {/* Developer Credit Section */}
        <div className="footer__divider"></div>
        <div className="footer__credit">
          <div className="credit-container">
            <h2 className="credit-title">🎬 Movies Recommendation System</h2>
            <p className="credit-developer">Developed by <span className="developer-name">Pradeep Prajapati</span></p>
            <p className="credit-guidance">Under the Guidance of <span className="developer-name">Pankaj Jain</span></p>
            <p className="credit-year">© 2026 - All Rights Reserved</p>
          </div>
        </div>

        <div className="footer__bottom">
          <p>&copy; 2026 Movies Recommendation System. All rights reserved.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal__close" onClick={() => setShowAuthModal(false)}><X size={20} /></button>
            <h2 className="modal__title">{authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>

            <div className="login-type-toggle">
              <button
                className={`toggle-btn ${loginType === 'email' ? 'toggle-btn--active' : ''}`}
                onClick={() => setLoginType('email')}
              >📧 Email</button>
              <button
                className={`toggle-btn ${loginType === 'phone' ? 'toggle-btn--active' : ''}`}
                onClick={() => setLoginType('phone')}
              >📱 Phone</button>
            </div>

            <div className="modal__form">
              {authMode === 'register' && (
                <input
                  className="modal__input"
                  type="text"
                  placeholder="Full Name"
                  value={authForm.name}
                  onChange={e => setAuthForm(p => ({ ...p, name: e.target.value }))}
                />
              )}

              {loginType === 'email' ? (
                <input
                  className="modal__input"
                  type="email"
                  placeholder="Email address"
                  value={authForm.email}
                  onChange={e => setAuthForm(p => ({ ...p, email: e.target.value }))}
                />
              ) : (
                <input
                  className="modal__input"
                  type="tel"
                  placeholder="Phone number"
                  value={authForm.phone}
                  onChange={e => setAuthForm(p => ({ ...p, phone: e.target.value }))}
                />
              )}

              <input
                className="modal__input"
                type="password"
                placeholder="Password"
                value={authForm.password}
                onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))}
              />

              {authError && <p className="modal__error">{authError}</p>}

              <button className="btn btn--primary btn--full" onClick={handleAuth}>
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>

              <p className="modal__switch">
                {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <span onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}>
                  {authMode === 'login' ? 'Sign Up' : 'Sign In'}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;import React, { useState, useEffect } from 'react';
import './App.css';
import { Sun, Moon, Play, Plus, Star, Flame, X, User, LogOut, Check, Globe, Clapperboard, Landmark, Search } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

const App = () => {
  const [theme, setTheme] = useState('dark');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredMovie, setHoveredMovie] = useState(null);
  const [activeCategory, setActiveCategory] = useState('trending');

  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [loginType, setLoginType] = useState('email');
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');

  // Movie state
  const [movies, setMovies] = useState({ trending: [], originals: [], popular: [], bollywood: [], hollywood: [], world: [], watchlist: [] });
  const [movieErrors, setMovieErrors] = useState({ trending: null, originals: null, popular: null, bollywood: null, hollywood: null, world: null, watchlist: null });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');

  // Genre state - list of {id, name} from TMDB, plus which genre (if any) is active
  const [genres, setGenres] = useState([]);
  const [activeGenreId, setActiveGenreId] = useState(null);
  const [genreLoading, setGenreLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [previousCategory, setPreviousCategory] = useState('trending');

  // Load user from localStorage on start
  useEffect(() => {
    const savedUser = localStorage.getItem('mf_user');
    const savedToken = localStorage.getItem('mf_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch movies on load
  useEffect(() => {
    fetchMovies();
    fetchGenres();
  }, []);

  // Fetch watchlist when user logs in
  useEffect(() => {
    if (user && token) fetchWatchlist();
  }, [user, token]);

  // Fetches one category, updates its movies on success or its error on failure.
  // Fetching each category independently (instead of one Promise.all) means one
  // broken category (e.g. a bad TMDB key) doesn't hide the others.
  const fetchCategory = async (category, endpoint) => {
    try {
      const res = await fetch(`${API}/movies/${endpoint}`);
      const data = await res.json();

      if (!res.ok) {
        // Backend responded, but with an error (bad/expired TMDB key, rate limit, etc.)
        setMovieErrors(prev => ({ ...prev, [category]: data.message || 'Failed to load movies' }));
        setMovies(prev => ({ ...prev, [category]: [] }));
        return;
      }

      const list = Array.isArray(data) ? data : (data.results || []);
      setMovies(prev => ({ ...prev, [category]: list }));
      setMovieErrors(prev => ({ ...prev, [category]: null }));
    } catch (err) {
      // Network-level failure - backend isn't reachable at all
      console.error(`Failed to fetch ${category}:`, err);
      setMovieErrors(prev => ({ ...prev, [category]: 'Cannot reach the backend. Make sure it is running on port 5000.' }));
      setMovies(prev => ({ ...prev, [category]: [] }));
    }
  };

  const fetchMovies = async () => {
    setLoading(true);
    await Promise.all([
      fetchCategory('trending', 'trending'),
      fetchCategory('originals', 'originals'),
      fetchCategory('popular', 'popular'),
      fetchCategory('bollywood', 'bollywood'),
      fetchCategory('hollywood', 'hollywood'),
      fetchCategory('world', 'world'),
    ]);
    setLoading(false);
  };

  const fetchGenres = async () => {
    try {
      const res = await fetch(`${API}/movies/genres`);
      const data = await res.json();
      if (res.ok) setGenres(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch genres:', err);
    }
  };

  // Clicking a genre pill (Action, Comedy, Drama, etc.) loads movies for that
  // genre into their own category slot ("genre_<id>") and switches to it, so
  // switching back to Trending/Popular/etc. still shows their cached results.
  const selectGenre = async (genre) => {
    setActiveGenreId(genre.id);
    setIsSearching(false);
    setSearchQuery('');
    const categoryKey = `genre_${genre.id}`;
    setActiveCategory(categoryKey);

    const alreadyLoaded = movies[categoryKey] !== undefined && !movieErrors[categoryKey];
    if (alreadyLoaded) return; // loaded successfully before, no need to refetch

    setGenreLoading(true);
    await fetchCategory(categoryKey, `genre/${genre.id}`);
    setGenreLoading(false);
  };

  const clearGenre = (categoryId) => {
    setActiveGenreId(null);
    setIsSearching(false);
    setSearchQuery('');
    setActiveCategory(categoryId);
  };

  // Runs a title search against the backend, which proxies TMDB's
  // /search/movie endpoint. Results live in their own "search" category slot,
  // and switching away simply returns to whatever tab was active before.
  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    if (!isSearching) setPreviousCategory(activeCategory);
    setActiveGenreId(null);
    setIsSearching(true);
    setActiveCategory('search');
    setSearchLoading(true);
    await fetchCategory('search', `search?query=${encodeURIComponent(q)}`);
    setSearchLoading(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setActiveCategory(previousCategory);
  };

  const fetchWatchlist = async () => {
    try {
      const res = await fetch(`${API}/watchlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) {
        setMovieErrors(prev => ({ ...prev, watchlist: data.message || 'Failed to load watchlist' }));
        return;
      }

      const watchlist = Array.isArray(data) ? data : (data.results || []);
      setMovies(prev => ({ ...prev, watchlist }));
      setMovieErrors(prev => ({ ...prev, watchlist: null }));
    } catch (err) {
      console.error('Failed to fetch watchlist:', err);
      setMovieErrors(prev => ({ ...prev, watchlist: 'Cannot reach the backend. Make sure it is running on port 5000.' }));
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const showNotif = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleAuth = async () => {
    setAuthError('');
    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
    const body = {
      ...(authMode === 'register' && { name: authForm.name }),
      ...(loginType === 'email' ? { email: authForm.email } : { phone: authForm.phone }),
      password: authForm.password
    };

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.message); return; }

      localStorage.setItem('mf_token', data.token);
      localStorage.setItem('mf_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setShowAuthModal(false);
      setAuthForm({ name: '', email: '', phone: '', password: '' });
      showNotif(`Welcome ${data.user.name || 'back'}! 🎬`);
    } catch {
      setAuthError('Server error. Make sure backend is running on port 5000.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mf_token');
    localStorage.removeItem('mf_user');
    setUser(null);
    setToken('');
    setMovies(prev => ({ ...prev, watchlist: [] }));
    showNotif('Logged out successfully');
  };

  const handleWatchlist = async (movie) => {
    if (!user) { setShowAuthModal(true); return; }
    const inWatchlist = movies.watchlist.some(m => m.id === movie.id);
    try {
      const res = await fetch(`${API}/watchlist/${movie.id}`, {
        method: inWatchlist ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (inWatchlist) {
          setMovies(prev => ({ ...prev, watchlist: prev.watchlist.filter(m => m.id !== movie.id) }));
          showNotif('Removed from watchlist');
        } else {
          setMovies(prev => ({ ...prev, watchlist: [...prev.watchlist, movie] }));
          showNotif('Added to watchlist ✅');
        }
      } else {
        showNotif(data.message || 'Could not update watchlist');
      }
    } catch {
      showNotif('Cannot reach the backend. Make sure it is running on port 5000.');
    }
  };

  const categories = [
    { id: 'trending', label: 'Trending Now', icon: Flame },
    { id: 'originals', label: 'Originals', icon: Star },
    { id: 'popular', label: 'Popular', icon: Play },
    { id: 'bollywood', label: 'Bollywood', icon: Landmark },
    { id: 'hollywood', label: 'Hollywood', icon: Clapperboard },
    { id: 'world', label: 'World Cinema', icon: Globe },
    { id: 'watchlist', label: 'Watchlist', icon: Plus },
  ];

  const currentMovies = movies[activeCategory] || [];

  return (
    <div className={`app app--${theme}`}>

      {/* Notification Toast */}
      {notification && (
        <div className="notification">{notification}</div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header__left">
          <div className="logo">
            <span className="logo__text">Movies Recommendation System</span>
          </div>

          <form className="search-bar" onSubmit={handleSearch}>
            <Search size={18} className="search-bar__icon" />
            <input
              type="text"
              className="search-bar__input"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-bar__clear"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </form>
        </div>

        <div className="header__right">
          <div className="clock">
            <div className="clock__time">{formatTime(currentTime)}</div>
            <div className="clock__date">{formatDate(currentTime)}</div>
          </div>

          {/* Login/User Button */}
          {user ? (
            <div className="user-menu">
              <div className="user-info">
                <User size={18} />
                <span>{user.name || user.email || user.phone}</span>
              </div>
              <button className="logout-btn" onClick={handleLogout} title="Logout">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button className="login-btn" onClick={() => setShowAuthModal(true)}>
              <User size={18} /> Sign In
            </button>
          )}

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero__content">
          <h1 className="hero__title">{user ? `Welcome, ${user.name || 'Movie Lover'}!` : 'Welcome Back'}</h1>
          <p className="hero__subtitle">Discover your next favorite movie</p>
          <div className="hero__actions">
            <button className="btn btn--primary">
              <Play size={20} /> Start Watching
            </button>
            <button className="btn btn--secondary" onClick={() => !user && setShowAuthModal(true)}>
              <Plus size={20} /> Add to List
            </button>
          </div>
        </div>
        <div className="hero__decoration"></div>
      </section>

      {/* Category Navigation */}
      <nav className="categories">
        {categories.map((cat) => {
          const IconComponent = cat.icon;
          return (
            <button
              key={cat.id}
              className={`category-btn ${activeCategory === cat.id ? 'category-btn--active' : ''}`}
              onClick={() => clearGenre(cat.id)}
            >
              <IconComponent size={20} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Genre Filter */}
      {genres.length > 0 && (
        <nav className="categories categories--genres">
          {genres.map((genre) => (
            <button
              key={genre.id}
              className={`category-btn category-btn--genre ${activeGenreId === genre.id ? 'category-btn--active' : ''}`}
              onClick={() => selectGenre(genre)}
            >
              <span>{genre.name}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Movies Grid */}
      <section className="content">
        {isSearching ? (
          <h2 className="content__heading">
            Search results for "{searchQuery}"
          </h2>
        ) : activeGenreId && (
          <h2 className="content__heading">
            {genres.find(g => g.id === activeGenreId)?.name} Movies
          </h2>
        )}
        {(isSearching && searchLoading) || (loading && activeCategory !== 'watchlist' && !activeGenreId && !isSearching) || (activeGenreId && genreLoading) ? (
          <div className="loading">
            <div className="loading__spinner"></div>
            <p>Loading movies...</p>
          </div>
        ) : movieErrors[activeCategory] ? (
          <div className="empty-state">
            <p>⚠️ {movieErrors[activeCategory]}</p>
            <button
              className="btn btn--primary"
              style={{ marginTop: '12px' }}
              onClick={() => {
                if (isSearching) handleSearch({ preventDefault: () => {} });
                else if (activeCategory === 'watchlist') fetchWatchlist();
                else if (activeGenreId) selectGenre({ id: activeGenreId, name: genres.find(g => g.id === activeGenreId)?.name });
                else fetchMovies();
              }}
            >
              Try Again
            </button>
          </div>
        ) : currentMovies.length === 0 ? (
          <div className="empty-state">
            {activeCategory === 'watchlist' ? (
              <>
                <p>Your watchlist is empty.</p>
                <p>{user ? 'Click + on any movie to add it!' : 'Sign in to save movies to your watchlist.'}</p>
                {!user && <button className="btn btn--primary" style={{marginTop:'12px'}} onClick={() => setShowAuthModal(true)}>Sign In</button>}
              </>
            ) : (
              <p>No movies found.</p>
            )}
          </div>
        ) : (
          <div className="movies-grid">
            {currentMovies.map((movie) => {
              const inWatchlist = movies.watchlist.some(m => m.id === movie.id);
              const posterUrl = movie.poster_path ? `${TMDB_IMG}${movie.poster_path}` : null;
              return (
                <div
                  key={movie.id}
                  className="movie-card"
                  onMouseEnter={() => setHoveredMovie(movie.id)}
                  onMouseLeave={() => setHoveredMovie(null)}
                >
                  <div
                    className="movie-card__image"
                    style={!posterUrl ? { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' } : {}}
                  >
                    {posterUrl && <img src={posterUrl} alt={movie.title} loading="lazy" />}
                    <div className="movie-card__overlay">
                      <div className="movie-card__actions">
                        <button className="action-btn action-btn--play" title="Play">
                          <Play size={24} />
                        </button>
                        <button
                          className={`action-btn ${inWatchlist ? 'action-btn--added' : 'action-btn--add'}`}
                          title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                          onClick={(e) => { e.stopPropagation(); handleWatchlist(movie); }}
                        >
                          {inWatchlist ? <Check size={24} /> : <Plus size={24} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="movie-card__info">
                    <h3 className="movie-card__title">{movie.title}</h3>
                    <div className="movie-card__meta">
                      <div className="movie-card__rating">
                        <Star size={16} />
                        <span>{movie.vote_average ? movie.vote_average.toFixed(1) : movie.rating}</span>
                      </div>
                      <span className="movie-card__genre">
                        {movie.genre || (movie.genre_ids && genres.find(g => g.id === movie.genre_ids[0])?.name) || ''}
                      </span>
                      <span className="movie-card__year">{movie.release_date ? movie.release_date.slice(0, 4) : movie.year}</span>
                    </div>
                  </div>

                  {hoveredMovie === movie.id && (
                    <div className="movie-card__expanded">
                      <p className="movie-card__description">
                        {movie.overview ? movie.overview.slice(0, 100) + '...' : 'Experience an unforgettable journey into a world of wonder, mystery, and intrigue.'}
                      </p>
                      <div className="movie-card__expanded-actions">
                        <button className="btn btn--small btn--primary">Play Now</button>
                        <button className="btn btn--small btn--secondary" onClick={() => handleWatchlist(movie)}>
                          {inWatchlist ? 'Remove' : '+ Watchlist'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer__content">
          <div className="footer__section">
            <h4>About Movies Recommendation System</h4>
            <p>Your ultimate streaming destination for movies, series, and more.</p>
          </div>
          <div className="footer__section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#browse">Browse</a></li>
              <li><a href="#help">Help</a></li>
            </ul>
          </div>
          <div className="footer__section">
            <h4>Legal</h4>
            <ul>
              <li><a href="#terms">Terms of Use</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#cookies">Cookie Settings</a></li>
            </ul>
          </div>
        </div>

        {/* Developer Credit Section */}
        <div className="footer__divider"></div>
        <div className="footer__credit">
          <div className="credit-container">
            <h2 className="credit-title">🎬 Movies Recommendation System</h2>
            <p className="credit-developer">Developed by <span className="developer-name">Pradeep Prajapati</span></p>
            <p className="credit-guidance">Under the Guidance of <span className="developer-name">Pankaj Jain</span></p>
            <p className="credit-year">© 2026 - All Rights Reserved</p>
          </div>
        </div>

        <div className="footer__bottom">
          <p>&copy; 2026 Movies Recommendation System. All rights reserved.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal__close" onClick={() => setShowAuthModal(false)}><X size={20} /></button>
            <h2 className="modal__title">{authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>

            <div className="login-type-toggle">
              <button
                className={`toggle-btn ${loginType === 'email' ? 'toggle-btn--active' : ''}`}
                onClick={() => setLoginType('email')}
              >📧 Email</button>
              <button
                className={`toggle-btn ${loginType === 'phone' ? 'toggle-btn--active' : ''}`}
                onClick={() => setLoginType('phone')}
              >📱 Phone</button>
            </div>

            <div className="modal__form">
              {authMode === 'register' && (
                <input
                  className="modal__input"
                  type="text"
                  placeholder="Full Name"
                  value={authForm.name}
                  onChange={e => setAuthForm(p => ({ ...p, name: e.target.value }))}
                />
              )}

              {loginType === 'email' ? (
                <input
                  className="modal__input"
                  type="email"
                  placeholder="Email address"
                  value={authForm.email}
                  onChange={e => setAuthForm(p => ({ ...p, email: e.target.value }))}
                />
              ) : (
                <input
                  className="modal__input"
                  type="tel"
                  placeholder="Phone number"
                  value={authForm.phone}
                  onChange={e => setAuthForm(p => ({ ...p, phone: e.target.value }))}
                />
              )}

              <input
                className="modal__input"
                type="password"
                placeholder="Password"
                value={authForm.password}
                onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))}
              />

              {authError && <p className="modal__error">{authError}</p>}

              <button className="btn btn--primary btn--full" onClick={handleAuth}>
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>

              <p className="modal__switch">
                {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <span onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}>
                  {authMode === 'login' ? 'Sign Up' : 'Sign In'}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;import React, { useState, useEffect } from 'react';
import './App.css';
import { Sun, Moon, Play, Plus, Star, Flame, X, User, LogOut, Check, Globe, Clapperboard, Landmark, Search } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

const App = () => {
  const [theme, setTheme] = useState('dark');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredMovie, setHoveredMovie] = useState(null);
  const [activeCategory, setActiveCategory] = useState('trending');

  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [loginType, setLoginType] = useState('email');
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');

  // Movie state
  const [movies, setMovies] = useState({ trending: [], originals: [], popular: [], bollywood: [], hollywood: [], world: [], watchlist: [] });
  const [movieErrors, setMovieErrors] = useState({ trending: null, originals: null, popular: null, bollywood: null, hollywood: null, world: null, watchlist: null });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');

  // Genre state - list of {id, name} from TMDB, plus which genre (if any) is active
  const [genres, setGenres] = useState([]);
  const [activeGenreId, setActiveGenreId] = useState(null);
  const [genreLoading, setGenreLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [previousCategory, setPreviousCategory] = useState('trending');

  // Load user from localStorage on start
  useEffect(() => {
    const savedUser = localStorage.getItem('mf_user');
    const savedToken = localStorage.getItem('mf_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch movies on load
  useEffect(() => {
    fetchMovies();
    fetchGenres();
  }, []);

  // Fetch watchlist when user logs in
  useEffect(() => {
    if (user && token) fetchWatchlist();
  }, [user, token]);

  // Fetches one category, updates its movies on success or its error on failure.
  // Fetching each category independently (instead of one Promise.all) means one
  // broken category (e.g. a bad TMDB key) doesn't hide the others.
  const fetchCategory = async (category, endpoint) => {
    try {
      const res = await fetch(`${API}/movies/${endpoint}`);
      const data = await res.json();

      if (!res.ok) {
        // Backend responded, but with an error (bad/expired TMDB key, rate limit, etc.)
        setMovieErrors(prev => ({ ...prev, [category]: data.message || 'Failed to load movies' }));
        setMovies(prev => ({ ...prev, [category]: [] }));
        return;
      }

      const list = Array.isArray(data) ? data : (data.results || []);
      setMovies(prev => ({ ...prev, [category]: list }));
      setMovieErrors(prev => ({ ...prev, [category]: null }));
    } catch (err) {
      // Network-level failure - backend isn't reachable at all
      console.error(`Failed to fetch ${category}:`, err);
      setMovieErrors(prev => ({ ...prev, [category]: 'Cannot reach the backend. Make sure it is running on port 5000.' }));
      setMovies(prev => ({ ...prev, [category]: [] }));
    }
  };

  const fetchMovies = async () => {
    setLoading(true);
    await Promise.all([
      fetchCategory('trending', 'trending'),
      fetchCategory('originals', 'originals'),
      fetchCategory('popular', 'popular'),
      fetchCategory('bollywood', 'bollywood'),
      fetchCategory('hollywood', 'hollywood'),
      fetchCategory('world', 'world'),
    ]);
    setLoading(false);
  };

  const fetchGenres = async () => {
    try {
      const res = await fetch(`${API}/movies/genres`);
      const data = await res.json();
      if (res.ok) setGenres(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch genres:', err);
    }
  };

  // Clicking a genre pill (Action, Comedy, Drama, etc.) loads movies for that
  // genre into their own category slot ("genre_<id>") and switches to it, so
  // switching back to Trending/Popular/etc. still shows their cached results.
  const selectGenre = async (genre) => {
    setActiveGenreId(genre.id);
    setIsSearching(false);
    setSearchQuery('');
    const categoryKey = `genre_${genre.id}`;
    setActiveCategory(categoryKey);

    const alreadyLoaded = movies[categoryKey] !== undefined && !movieErrors[categoryKey];
    if (alreadyLoaded) return; // loaded successfully before, no need to refetch

    setGenreLoading(true);
    await fetchCategory(categoryKey, `genre/${genre.id}`);
    setGenreLoading(false);
  };

  const clearGenre = (categoryId) => {
    setActiveGenreId(null);
    setIsSearching(false);
    setSearchQuery('');
    setActiveCategory(categoryId);
  };

  // Runs a title search against the backend, which proxies TMDB's
  // /search/movie endpoint. Results live in their own "search" category slot,
  // and switching away simply returns to whatever tab was active before.
  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    if (!isSearching) setPreviousCategory(activeCategory);
    setActiveGenreId(null);
    setIsSearching(true);
    setActiveCategory('search');
    setSearchLoading(true);
    await fetchCategory('search', `search?query=${encodeURIComponent(q)}`);
    setSearchLoading(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setActiveCategory(previousCategory);
  };

  const fetchWatchlist = async () => {
    try {
      const res = await fetch(`${API}/watchlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) {
        setMovieErrors(prev => ({ ...prev, watchlist: data.message || 'Failed to load watchlist' }));
        return;
      }

      const watchlist = Array.isArray(data) ? data : (data.results || []);
      setMovies(prev => ({ ...prev, watchlist }));
      setMovieErrors(prev => ({ ...prev, watchlist: null }));
    } catch (err) {
      console.error('Failed to fetch watchlist:', err);
      setMovieErrors(prev => ({ ...prev, watchlist: 'Cannot reach the backend. Make sure it is running on port 5000.' }));
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const showNotif = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleAuth = async () => {
    setAuthError('');
    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
    const body = {
      ...(authMode === 'register' && { name: authForm.name }),
      ...(loginType === 'email' ? { email: authForm.email } : { phone: authForm.phone }),
      password: authForm.password
    };

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.message); return; }

      localStorage.setItem('mf_token', data.token);
      localStorage.setItem('mf_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setShowAuthModal(false);
      setAuthForm({ name: '', email: '', phone: '', password: '' });
      showNotif(`Welcome ${data.user.name || 'back'}! 🎬`);
    } catch {
      setAuthError('Server error. Make sure backend is running on port 5000.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mf_token');
    localStorage.removeItem('mf_user');
    setUser(null);
    setToken('');
    setMovies(prev => ({ ...prev, watchlist: [] }));
    showNotif('Logged out successfully');
  };

  const handleWatchlist = async (movie) => {
    if (!user) { setShowAuthModal(true); return; }
    const inWatchlist = movies.watchlist.some(m => m.id === movie.id);
    try {
      const res = await fetch(`${API}/watchlist/${movie.id}`, {
        method: inWatchlist ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (inWatchlist) {
          setMovies(prev => ({ ...prev, watchlist: prev.watchlist.filter(m => m.id !== movie.id) }));
          showNotif('Removed from watchlist');
        } else {
          setMovies(prev => ({ ...prev, watchlist: [...prev.watchlist, movie] }));
          showNotif('Added to watchlist ✅');
        }
      } else {
        showNotif(data.message || 'Could not update watchlist');
      }
    } catch {
      showNotif('Cannot reach the backend. Make sure it is running on port 5000.');
    }
  };

  const categories = [
    { id: 'trending', label: 'Trending Now', icon: Flame },
    { id: 'originals', label: 'Originals', icon: Star },
    { id: 'popular', label: 'Popular', icon: Play },
    { id: 'bollywood', label: 'Bollywood', icon: Landmark },
    { id: 'hollywood', label: 'Hollywood', icon: Clapperboard },
    { id: 'world', label: 'World Cinema', icon: Globe },
    { id: 'watchlist', label: 'Watchlist', icon: Plus },
  ];

  const currentMovies = movies[activeCategory] || [];

  return (
    <div className={`app app--${theme}`}>

      {/* Notification Toast */}
      {notification && (
        <div className="notification">{notification}</div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header__left">
          <div className="logo">
            <span className="logo__text">Movies Recommendation System</span>
          </div>

          <form className="search-bar" onSubmit={handleSearch}>
            <Search size={18} className="search-bar__icon" />
            <input
              type="text"
              className="search-bar__input"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-bar__clear"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </form>
        </div>

        <div className="header__right">
          <div className="clock">
            <div className="clock__time">{formatTime(currentTime)}</div>
            <div className="clock__date">{formatDate(currentTime)}</div>
          </div>

          {/* Login/User Button */}
          {user ? (
            <div className="user-menu">
              <div className="user-info">
                <User size={18} />
                <span>{user.name || user.email || user.phone}</span>
              </div>
              <button className="logout-btn" onClick={handleLogout} title="Logout">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button className="login-btn" onClick={() => setShowAuthModal(true)}>
              <User size={18} /> Sign In
            </button>
          )}

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero__content">
          <h1 className="hero__title">{user ? `Welcome, ${user.name || 'Movie Lover'}!` : 'Welcome Back'}</h1>
          <p className="hero__subtitle">Discover your next favorite movie</p>
          <div className="hero__actions">
            <button className="btn btn--primary">
              <Play size={20} /> Start Watching
            </button>
            <button className="btn btn--secondary" onClick={() => !user && setShowAuthModal(true)}>
              <Plus size={20} /> Add to List
            </button>
          </div>
        </div>
        <div className="hero__decoration"></div>
      </section>

      {/* Category Navigation */}
      <nav className="categories">
        {categories.map((cat) => {
          const IconComponent = cat.icon;
          return (
            <button
              key={cat.id}
              className={`category-btn ${activeCategory === cat.id ? 'category-btn--active' : ''}`}
              onClick={() => clearGenre(cat.id)}
            >
              <IconComponent size={20} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Genre Filter */}
      {genres.length > 0 && (
        <nav className="categories categories--genres">
          {genres.map((genre) => (
            <button
              key={genre.id}
              className={`category-btn category-btn--genre ${activeGenreId === genre.id ? 'category-btn--active' : ''}`}
              onClick={() => selectGenre(genre)}
            >
              <span>{genre.name}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Movies Grid */}
      <section className="content">
        {isSearching ? (
          <h2 className="content__heading">
            Search results for "{searchQuery}"
          </h2>
        ) : activeGenreId && (
          <h2 className="content__heading">
            {genres.find(g => g.id === activeGenreId)?.name} Movies
          </h2>
        )}
        {(isSearching && searchLoading) || (loading && activeCategory !== 'watchlist' && !activeGenreId && !isSearching) || (activeGenreId && genreLoading) ? (
          <div className="loading">
            <div className="loading__spinner"></div>
            <p>Loading movies...</p>
          </div>
        ) : movieErrors[activeCategory] ? (
          <div className="empty-state">
            <p>⚠️ {movieErrors[activeCategory]}</p>
            <button
              className="btn btn--primary"
              style={{ marginTop: '12px' }}
              onClick={() => {
                if (isSearching) handleSearch({ preventDefault: () => {} });
                else if (activeCategory === 'watchlist') fetchWatchlist();
                else if (activeGenreId) selectGenre({ id: activeGenreId, name: genres.find(g => g.id === activeGenreId)?.name });
                else fetchMovies();
              }}
            >
              Try Again
            </button>
          </div>
        ) : currentMovies.length === 0 ? (
          <div className="empty-state">
            {activeCategory === 'watchlist' ? (
              <>
                <p>Your watchlist is empty.</p>
                <p>{user ? 'Click + on any movie to add it!' : 'Sign in to save movies to your watchlist.'}</p>
                {!user && <button className="btn btn--primary" style={{marginTop:'12px'}} onClick={() => setShowAuthModal(true)}>Sign In</button>}
              </>
            ) : (
              <p>No movies found.</p>
            )}
          </div>
        ) : (
          <div className="movies-grid">
            {currentMovies.map((movie) => {
              const inWatchlist = movies.watchlist.some(m => m.id === movie.id);
              const posterUrl = movie.poster_path ? `${TMDB_IMG}${movie.poster_path}` : null;
              return (
                <div
                  key={movie.id}
                  className="movie-card"
                  onMouseEnter={() => setHoveredMovie(movie.id)}
                  onMouseLeave={() => setHoveredMovie(null)}
                >
                  <div
                    className="movie-card__image"
                    style={!posterUrl ? { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' } : {}}
                  >
                    {posterUrl && <img src={posterUrl} alt={movie.title} loading="lazy" />}
                    <div className="movie-card__overlay">
                      <div className="movie-card__actions">
                        <button className="action-btn action-btn--play" title="Play">
                          <Play size={24} />
                        </button>
                        <button
                          className={`action-btn ${inWatchlist ? 'action-btn--added' : 'action-btn--add'}`}
                          title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                          onClick={(e) => { e.stopPropagation(); handleWatchlist(movie); }}
                        >
                          {inWatchlist ? <Check size={24} /> : <Plus size={24} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="movie-card__info">
                    <h3 className="movie-card__title">{movie.title}</h3>
                    <div className="movie-card__meta">
                      <div className="movie-card__rating">
                        <Star size={16} />
                        <span>{movie.vote_average ? movie.vote_average.toFixed(1) : movie.rating}</span>
                      </div>
                      <span className="movie-card__genre">
                        {movie.genre || (movie.genre_ids && genres.find(g => g.id === movie.genre_ids[0])?.name) || ''}
                      </span>
                      <span className="movie-card__year">{movie.release_date ? movie.release_date.slice(0, 4) : movie.year}</span>
                    </div>
                  </div>

                  {hoveredMovie === movie.id && (
                    <div className="movie-card__expanded">
                      <p className="movie-card__description">
                        {movie.overview ? movie.overview.slice(0, 100) + '...' : 'Experience an unforgettable journey into a world of wonder, mystery, and intrigue.'}
                      </p>
                      <div className="movie-card__expanded-actions">
                        <button className="btn btn--small btn--primary">Play Now</button>
                        <button className="btn btn--small btn--secondary" onClick={() => handleWatchlist(movie)}>
                          {inWatchlist ? 'Remove' : '+ Watchlist'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer__content">
          <div className="footer__section">
            <h4>About Movies Recommendation System</h4>
            <p>Your ultimate streaming destination for movies, series, and more.</p>
          </div>
          <div className="footer__section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#browse">Browse</a></li>
              <li><a href="#help">Help</a></li>
            </ul>
          </div>
          <div className="footer__section">
            <h4>Legal</h4>
            <ul>
              <li><a href="#terms">Terms of Use</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#cookies">Cookie Settings</a></li>
            </ul>
          </div>
        </div>

        {/* Developer Credit Section */}
        <div className="footer__divider"></div>
        <div className="footer__credit">
          <div className="credit-container">
            <h2 className="credit-title">🎬 Movies Recommendation System</h2>
            <p className="credit-developer">Developed by <span className="developer-name">Pradeep Prajapati</span></p>
            <p className="credit-guidance">Under the Guidance of <span className="developer-name">Pankaj Jain</span></p>
            <p className="credit-year">© 2026 - All Rights Reserved</p>
          </div>
        </div>

        <div className="footer__bottom">
          <p>&copy; 2026 Movies Recommendation System. All rights reserved.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal__close" onClick={() => setShowAuthModal(false)}><X size={20} /></button>
            <h2 className="modal__title">{authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>

            <div className="login-type-toggle">
              <button
                className={`toggle-btn ${loginType === 'email' ? 'toggle-btn--active' : ''}`}
                onClick={() => setLoginType('email')}
              >📧 Email</button>
              <button
                className={`toggle-btn ${loginType === 'phone' ? 'toggle-btn--active' : ''}`}
                onClick={() => setLoginType('phone')}
              >📱 Phone</button>
            </div>

            <div className="modal__form">
              {authMode === 'register' && (
                <input
                  className="modal__input"
                  type="text"
                  placeholder="Full Name"
                  value={authForm.name}
                  onChange={e => setAuthForm(p => ({ ...p, name: e.target.value }))}
                />
              )}

              {loginType === 'email' ? (
                <input
                  className="modal__input"
                  type="email"
                  placeholder="Email address"
                  value={authForm.email}
                  onChange={e => setAuthForm(p => ({ ...p, email: e.target.value }))}
                />
              ) : (
                <input
                  className="modal__input"
                  type="tel"
                  placeholder="Phone number"
                  value={authForm.phone}
                  onChange={e => setAuthForm(p => ({ ...p, phone: e.target.value }))}
                />
              )}

              <input
                className="modal__input"
                type="password"
                placeholder="Password"
                value={authForm.password}
                onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))}
              />

              {authError && <p className="modal__error">{authError}</p>}

              <button className="btn btn--primary btn--full" onClick={handleAuth}>
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>

              <p className="modal__switch">
                {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <span onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}>
                  {authMode === 'login' ? 'Sign Up' : 'Sign In'}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;import React, { useState, useEffect } from 'react';
import './App.css';
import { Sun, Moon, Play, Plus, Star, Flame, X, User, LogOut, Check, Globe, Clapperboard, Landmark, Search } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

const App = () => {
  const [theme, setTheme] = useState('dark');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredMovie, setHoveredMovie] = useState(null);
  const [activeCategory, setActiveCategory] = useState('trending');

  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [loginType, setLoginType] = useState('email');
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');

  // Movie state
  const [movies, setMovies] = useState({ trending: [], originals: [], popular: [], bollywood: [], hollywood: [], world: [], watchlist: [] });
  const [movieErrors, setMovieErrors] = useState({ trending: null, originals: null, popular: null, bollywood: null, hollywood: null, world: null, watchlist: null });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');

  // Genre state - list of {id, name} from TMDB, plus which genre (if any) is active
  const [genres, setGenres] = useState([]);
  const [activeGenreId, setActiveGenreId] = useState(null);
  const [genreLoading, setGenreLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [previousCategory, setPreviousCategory] = useState('trending');

  // Load user from localStorage on start
  useEffect(() => {
    const savedUser = localStorage.getItem('mf_user');
    const savedToken = localStorage.getItem('mf_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch movies on load
  useEffect(() => {
    fetchMovies();
    fetchGenres();
  }, []);

  // Fetch watchlist when user logs in
  useEffect(() => {
    if (user && token) fetchWatchlist();
  }, [user, token]);

  // Fetches one category, updates its movies on success or its error on failure.
  // Fetching each category independently (instead of one Promise.all) means one
  // broken category (e.g. a bad TMDB key) doesn't hide the others.
  const fetchCategory = async (category, endpoint) => {
    try {
      const res = await fetch(`${API}/movies/${endpoint}`);
      const data = await res.json();

      if (!res.ok) {
        // Backend responded, but with an error (bad/expired TMDB key, rate limit, etc.)
        setMovieErrors(prev => ({ ...prev, [category]: data.message || 'Failed to load movies' }));
        setMovies(prev => ({ ...prev, [category]: [] }));
        return;
      }

      const list = Array.isArray(data) ? data : (data.results || []);
      setMovies(prev => ({ ...prev, [category]: list }));
      setMovieErrors(prev => ({ ...prev, [category]: null }));
    } catch (err) {
      // Network-level failure - backend isn't reachable at all
      console.error(`Failed to fetch ${category}:`, err);
      setMovieErrors(prev => ({ ...prev, [category]: 'Cannot reach the backend. Make sure it is running on port 5000.' }));
      setMovies(prev => ({ ...prev, [category]: [] }));
    }
  };

  const fetchMovies = async () => {
    setLoading(true);
    await Promise.all([
      fetchCategory('trending', 'trending'),
      fetchCategory('originals', 'originals'),
      fetchCategory('popular', 'popular'),
      fetchCategory('bollywood', 'bollywood'),
      fetchCategory('hollywood', 'hollywood'),
      fetchCategory('world', 'world'),
    ]);
    setLoading(false);
  };

  const fetchGenres = async () => {
    try {
      const res = await fetch(`${API}/movies/genres`);
      const data = await res.json();
      if (res.ok) setGenres(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch genres:', err);
    }
  };

  // Clicking a genre pill (Action, Comedy, Drama, etc.) loads movies for that
  // genre into their own category slot ("genre_<id>") and switches to it, so
  // switching back to Trending/Popular/etc. still shows their cached results.
  const selectGenre = async (genre) => {
    setActiveGenreId(genre.id);
    setIsSearching(false);
    setSearchQuery('');
    const categoryKey = `genre_${genre.id}`;
    setActiveCategory(categoryKey);

    const alreadyLoaded = movies[categoryKey] !== undefined && !movieErrors[categoryKey];
    if (alreadyLoaded) return; // loaded successfully before, no need to refetch

    setGenreLoading(true);
    await fetchCategory(categoryKey, `genre/${genre.id}`);
    setGenreLoading(false);
  };

  const clearGenre = (categoryId) => {
    setActiveGenreId(null);
    setIsSearching(false);
    setSearchQuery('');
    setActiveCategory(categoryId);
  };

  // Runs a title search against the backend, which proxies TMDB's
  // /search/movie endpoint. Results live in their own "search" category slot,
  // and switching away simply returns to whatever tab was active before.
  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    if (!isSearching) setPreviousCategory(activeCategory);
    setActiveGenreId(null);
    setIsSearching(true);
    setActiveCategory('search');
    setSearchLoading(true);
    await fetchCategory('search', `search?query=${encodeURIComponent(q)}`);
    setSearchLoading(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setActiveCategory(previousCategory);
  };

  const fetchWatchlist = async () => {
    try {
      const res = await fetch(`${API}/watchlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) {
        setMovieErrors(prev => ({ ...prev, watchlist: data.message || 'Failed to load watchlist' }));
        return;
      }

      const watchlist = Array.isArray(data) ? data : (data.results || []);
      setMovies(prev => ({ ...prev, watchlist }));
      setMovieErrors(prev => ({ ...prev, watchlist: null }));
    } catch (err) {
      console.error('Failed to fetch watchlist:', err);
      setMovieErrors(prev => ({ ...prev, watchlist: 'Cannot reach the backend. Make sure it is running on port 5000.' }));
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const showNotif = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleAuth = async () => {
    setAuthError('');
    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
    const body = {
      ...(authMode === 'register' && { name: authForm.name }),
      ...(loginType === 'email' ? { email: authForm.email } : { phone: authForm.phone }),
      password: authForm.password
    };

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.message); return; }

      localStorage.setItem('mf_token', data.token);
      localStorage.setItem('mf_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setShowAuthModal(false);
      setAuthForm({ name: '', email: '', phone: '', password: '' });
      showNotif(`Welcome ${data.user.name || 'back'}! 🎬`);
    } catch {
      setAuthError('Server error. Make sure backend is running on port 5000.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mf_token');
    localStorage.removeItem('mf_user');
    setUser(null);
    setToken('');
    setMovies(prev => ({ ...prev, watchlist: [] }));
    showNotif('Logged out successfully');
  };

  const handleWatchlist = async (movie) => {
    if (!user) { setShowAuthModal(true); return; }
    const inWatchlist = movies.watchlist.some(m => m.id === movie.id);
    try {
      const res = await fetch(`${API}/watchlist/${movie.id}`, {
        method: inWatchlist ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (inWatchlist) {
          setMovies(prev => ({ ...prev, watchlist: prev.watchlist.filter(m => m.id !== movie.id) }));
          showNotif('Removed from watchlist');
        } else {
          setMovies(prev => ({ ...prev, watchlist: [...prev.watchlist, movie] }));
          showNotif('Added to watchlist ✅');
        }
      } else {
        showNotif(data.message || 'Could not update watchlist');
      }
    } catch {
      showNotif('Cannot reach the backend. Make sure it is running on port 5000.');
    }
  };

  const categories = [
    { id: 'trending', label: 'Trending Now', icon: Flame },
    { id: 'originals', label: 'Originals', icon: Star },
    { id: 'popular', label: 'Popular', icon: Play },
    { id: 'bollywood', label: 'Bollywood', icon: Landmark },
    { id: 'hollywood', label: 'Hollywood', icon: Clapperboard },
    { id: 'world', label: 'World Cinema', icon: Globe },
    { id: 'watchlist', label: 'Watchlist', icon: Plus },
  ];

  const currentMovies = movies[activeCategory] || [];

  return (
    <div className={`app app--${theme}`}>

      {/* Notification Toast */}
      {notification && (
        <div className="notification">{notification}</div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header__left">
          <div className="logo">
            <span className="logo__text">Movies Recommendation System</span>
          </div>

          <form className="search-bar" onSubmit={handleSearch}>
            <Search size={18} className="search-bar__icon" />
            <input
              type="text"
              className="search-bar__input"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-bar__clear"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </form>
        </div>

        <div className="header__right">
          <div className="clock">
            <div className="clock__time">{formatTime(currentTime)}</div>
            <div className="clock__date">{formatDate(currentTime)}</div>
          </div>

          {/* Login/User Button */}
          {user ? (
            <div className="user-menu">
              <div className="user-info">
                <User size={18} />
                <span>{user.name || user.email || user.phone}</span>
              </div>
              <button className="logout-btn" onClick={handleLogout} title="Logout">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button className="login-btn" onClick={() => setShowAuthModal(true)}>
              <User size={18} /> Sign In
            </button>
          )}

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero__content">
          <h1 className="hero__title">{user ? `Welcome, ${user.name || 'Movie Lover'}!` : 'Welcome Back'}</h1>
          <p className="hero__subtitle">Discover your next favorite movie</p>
          <div className="hero__actions">
            <button className="btn btn--primary">
              <Play size={20} /> Start Watching
            </button>
            <button className="btn btn--secondary" onClick={() => !user && setShowAuthModal(true)}>
              <Plus size={20} /> Add to List
            </button>
          </div>
        </div>
        <div className="hero__decoration"></div>
      </section>

      {/* Category Navigation */}
      <nav className="categories">
        {categories.map((cat) => {
          const IconComponent = cat.icon;
          return (
            <button
              key={cat.id}
              className={`category-btn ${activeCategory === cat.id ? 'category-btn--active' : ''}`}
              onClick={() => clearGenre(cat.id)}
            >
              <IconComponent size={20} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Genre Filter */}
      {genres.length > 0 && (
        <nav className="categories categories--genres">
          {genres.map((genre) => (
            <button
              key={genre.id}
              className={`category-btn category-btn--genre ${activeGenreId === genre.id ? 'category-btn--active' : ''}`}
              onClick={() => selectGenre(genre)}
            >
              <span>{genre.name}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Movies Grid */}
      <section className="content">
        {isSearching ? (
          <h2 className="content__heading">
            Search results for "{searchQuery}"
          </h2>
        ) : activeGenreId && (
          <h2 className="content__heading">
            {genres.find(g => g.id === activeGenreId)?.name} Movies
          </h2>
        )}
        {(isSearching && searchLoading) || (loading && activeCategory !== 'watchlist' && !activeGenreId && !isSearching) || (activeGenreId && genreLoading) ? (
          <div className="loading">
            <div className="loading__spinner"></div>
            <p>Loading movies...</p>
          </div>
        ) : movieErrors[activeCategory] ? (
          <div className="empty-state">
            <p>⚠️ {movieErrors[activeCategory]}</p>
            <button
              className="btn btn--primary"
              style={{ marginTop: '12px' }}
              onClick={() => {
                if (isSearching) handleSearch({ preventDefault: () => {} });
                else if (activeCategory === 'watchlist') fetchWatchlist();
                else if (activeGenreId) selectGenre({ id: activeGenreId, name: genres.find(g => g.id === activeGenreId)?.name });
                else fetchMovies();
              }}
            >
              Try Again
            </button>
          </div>
        ) : currentMovies.length === 0 ? (
          <div className="empty-state">
            {activeCategory === 'watchlist' ? (
              <>
                <p>Your watchlist is empty.</p>
                <p>{user ? 'Click + on any movie to add it!' : 'Sign in to save movies to your watchlist.'}</p>
                {!user && <button className="btn btn--primary" style={{marginTop:'12px'}} onClick={() => setShowAuthModal(true)}>Sign In</button>}
              </>
            ) : (
              <p>No movies found.</p>
            )}
          </div>
        ) : (
          <div className="movies-grid">
            {currentMovies.map((movie) => {
              const inWatchlist = movies.watchlist.some(m => m.id === movie.id);
              const posterUrl = movie.poster_path ? `${TMDB_IMG}${movie.poster_path}` : null;
              return (
                <div
                  key={movie.id}
                  className="movie-card"
                  onMouseEnter={() => setHoveredMovie(movie.id)}
                  onMouseLeave={() => setHoveredMovie(null)}
                >
                  <div
                    className="movie-card__image"
                    style={!posterUrl ? { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' } : {}}
                  >
                    {posterUrl && <img src={posterUrl} alt={movie.title} loading="lazy" />}
                    <div className="movie-card__overlay">
                      <div className="movie-card__actions">
                        <button className="action-btn action-btn--play" title="Play">
                          <Play size={24} />
                        </button>
                        <button
                          className={`action-btn ${inWatchlist ? 'action-btn--added' : 'action-btn--add'}`}
                          title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                          onClick={(e) => { e.stopPropagation(); handleWatchlist(movie); }}
                        >
                          {inWatchlist ? <Check size={24} /> : <Plus size={24} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="movie-card__info">
                    <h3 className="movie-card__title">{movie.title}</h3>
                    <div className="movie-card__meta">
                      <div className="movie-card__rating">
                        <Star size={16} />
                        <span>{movie.vote_average ? movie.vote_average.toFixed(1) : movie.rating}</span>
                      </div>
                      <span className="movie-card__genre">
                        {movie.genre || (movie.genre_ids && genres.find(g => g.id === movie.genre_ids[0])?.name) || ''}
                      </span>
                      <span className="movie-card__year">{movie.release_date ? movie.release_date.slice(0, 4) : movie.year}</span>
                    </div>
                  </div>

                  {hoveredMovie === movie.id && (
                    <div className="movie-card__expanded">
                      <p className="movie-card__description">
                        {movie.overview ? movie.overview.slice(0, 100) + '...' : 'Experience an unforgettable journey into a world of wonder, mystery, and intrigue.'}
                      </p>
                      <div className="movie-card__expanded-actions">
                        <button className="btn btn--small btn--primary">Play Now</button>
                        <button className="btn btn--small btn--secondary" onClick={() => handleWatchlist(movie)}>
                          {inWatchlist ? 'Remove' : '+ Watchlist'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer__content">
          <div className="footer__section">
            <h4>About Movies Recommendation System</h4>
            <p>Your ultimate streaming destination for movies, series, and more.</p>
          </div>
          <div className="footer__section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#browse">Browse</a></li>
              <li><a href="#help">Help</a></li>
            </ul>
          </div>
          <div className="footer__section">
            <h4>Legal</h4>
            <ul>
              <li><a href="#terms">Terms of Use</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#cookies">Cookie Settings</a></li>
            </ul>
          </div>
        </div>

        {/* Developer Credit Section */}
        <div className="footer__divider"></div>
        <div className="footer__credit">
          <div className="credit-container">
            <h2 className="credit-title">🎬 Movies Recommendation System</h2>
            <p className="credit-developer">Developed by <span className="developer-name">Pradeep Prajapati</span></p>
            <p className="credit-guidance">Under the Guidance of <span className="developer-name">Pankaj Jain</span></p>
            <p className="credit-year">© 2026 - All Rights Reserved</p>
          </div>
        </div>

        <div className="footer__bottom">
          <p>&copy; 2026 Movies Recommendation System. All rights reserved.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal__close" onClick={() => setShowAuthModal(false)}><X size={20} /></button>
            <h2 className="modal__title">{authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>

            <div className="login-type-toggle">
              <button
                className={`toggle-btn ${loginType === 'email' ? 'toggle-btn--active' : ''}`}
                onClick={() => setLoginType('email')}
              >📧 Email</button>
              <button
                className={`toggle-btn ${loginType === 'phone' ? 'toggle-btn--active' : ''}`}
                onClick={() => setLoginType('phone')}
              >📱 Phone</button>
            </div>

            <div className="modal__form">
              {authMode === 'register' && (
                <input
                  className="modal__input"
                  type="text"
                  placeholder="Full Name"
                  value={authForm.name}
                  onChange={e => setAuthForm(p => ({ ...p, name: e.target.value }))}
                />
              )}

              {loginType === 'email' ? (
                <input
                  className="modal__input"
                  type="email"
                  placeholder="Email address"
                  value={authForm.email}
                  onChange={e => setAuthForm(p => ({ ...p, email: e.target.value }))}
                />
              ) : (
                <input
                  className="modal__input"
                  type="tel"
                  placeholder="Phone number"
                  value={authForm.phone}
                  onChange={e => setAuthForm(p => ({ ...p, phone: e.target.value }))}
                />
              )}

              <input
                className="modal__input"
                type="password"
                placeholder="Password"
                value={authForm.password}
                onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))}
              />

              {authError && <p className="modal__error">{authError}</p>}

              <button className="btn btn--primary btn--full" onClick={handleAuth}>
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>

              <p className="modal__switch">
                {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <span onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}>
                  {authMode === 'login' ? 'Sign Up' : 'Sign In'}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
