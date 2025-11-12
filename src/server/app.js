import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/config.js';
import seedDatabase from './config/seed.js';
import registerRoutes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.env === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Static files (Views)
app.use(express.static(path.join(__dirname, '../../public')));

// API Routes
registerRoutes(app);

// View routing - catch-all for SPA (skip static assets)
app.get('*', (req, res, next) => {
  const p = req.path;
  
  // Skip static assets - let static middleware handle them
  if (p.startsWith('/styles/') || 
      p.startsWith('/scripts/') || 
      p.startsWith('/images/') || 
      p.startsWith('/assets/') ||
      !p.endsWith('.html')) {
    return next();
  }
  
  // Redirect old root-level pages to new locations
  if (p === '/signin-page.html') return res.redirect('/login.html');
  if (p === '/signup-page.html') return res.redirect('/signup.html');
  if (p === '/profile-selection.html') return res.redirect('/profile-selection.html');
  
  // Serve public pages
  if (p === '/login.html' || p === '/signup.html' || p === '/profile-selection.html') {
    return res.sendFile(path.join(__dirname, '../../public/views', p));
  }
  
  // Require authentication for other pages
  if (!req.session.user) {
    return res.redirect('/login.html');
  }
  
  // Check if requesting a specific view file
  if (p.startsWith('/views/') && p.endsWith('.html')) {
    const fileName = p.replace('/views/', '');
    return res.sendFile(path.join(__dirname, '../../public/views', fileName));
  }
  
  // Serve main app for authenticated users (fallback)
  res.sendFile(path.join(__dirname, '../../public/views', 'index.html'));
});

// Initialize database and start server
(async function startServer() {
  try {
    await seedDatabase();
    
    app.listen(config.port, () => {
      console.log(`🚀 Server running on http://localhost:${config.port}`);
      console.log(`📦 Environment: ${config.env}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
