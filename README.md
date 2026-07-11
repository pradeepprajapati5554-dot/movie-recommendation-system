# MovieFlix — Movie Recommendation System

Full-stack movie app: React frontend, Express/Node backend, MongoDB database, TMDB for movie data.

```
Movie RS/
├── backend/     Express API + MongoDB (Node.js)
└── frontend/    React app (Create React App)
```

## Prerequisites

- **Node.js** 18+ and npm — https://nodejs.org
- **MongoDB** running locally on `mongodb://localhost:27017` (or a MongoDB Atlas connection string)
- A **TMDB API key** — one is already filled into `backend/.env` from the original project

## How to run it — 2 terminals, 2 commands

### Terminal 1 — Backend

```bash
cd backend
npm install
npm start
```

You should see:
```
🚀 Server running on port 5000
✅ MongoDB Connected - movieflix database
```

### Terminal 2 — Frontend

```bash
cd frontend
npm install
npm start
```

This opens your browser automatically at **http://localhost:3000**. That's the app.

That's it — leave both terminals running. To stop either one, click into it and press `Ctrl + C`.

## What was fixed

The original project had several issues that would stop it from running:

1. **`lucide-react` was missing from the frontend's `package.json`.** `App.js` imports icons from it, but it wasn't listed as a dependency — `npm install` would leave the app unable to find the package (`Module not found: Error: Can't resolve 'lucide-react'`).
2. **The backend had no `start` script**, so `npm start` did nothing runnable.
3. **Everything backend-related lived in a single 150-line `index.js`** — the Mongo connection, the User schema, the JWT middleware, and every route were mixed together. Now split into `config/`, `models/`, `middleware/`, `routes/`, and `utils/`.
4. **Dead files**: an empty `Server/app.js`, and empty `Client/App.js` / `Client/index.js` at the project root, plus a duplicate root `package.json` re-declaring React dependencies. All removed.
5. **A real build-breaking dependency conflict**: `react-scripts`'s bundled ESLint config conflicts with the `eslint-plugin-jest` version installed today, producing `Environment key "jest/globals" is unknown` and failing `npm run build`. Fixed with `DISABLE_ESLINT_PLUGIN=true` in the frontend's `.env`.
6. **The API base URL was hardcoded** in `App.js`. Moved to `REACT_APP_API_URL` in `.env` so it can point anywhere without touching code.
7. Added basic input validation, a 404 handler, and a centralized error handler on the backend — none existed before.
8. Added `.gitignore` files so `node_modules` and `.env` (which holds real secrets) don't get committed.

I installed and ran both sides myself to confirm this actually works: backend boots and answers `/api/health`, frontend builds and starts clean.

## Backend structure

```
backend/
├── server.js               Entry point — wires everything together, starts listening
├── config/db.js             MongoDB connection logic
├── models/User.js           Mongoose schema (name, email/phone, password, watchlist)
├── middleware/auth.js       JWT verification for protected routes
├── routes/
│   ├── authRoutes.js         POST /api/auth/register, /api/auth/login
│   ├── movieRoutes.js        GET  /api/movies/trending, /originals, /popular, /search
│   └── watchlistRoutes.js    GET/POST/DELETE /api/watchlist (requires login)
└── utils/tmdb.js            Pre-configured TMDB API client
```

## Notes

- Passwords are hashed with `bcryptjs` before being stored.
- The JWT secret and TMDB key in `backend/.env` are the original project's real dev values — fine for local development, but rotate them before deploying anywhere public.
