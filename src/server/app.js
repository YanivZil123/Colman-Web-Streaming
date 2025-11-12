import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import config from './config/config.js';
import seedDatabase from './config/seed.js';
import registerRoutes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.env === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use((req, res, next) => {
  const publicPaths = ['/signin.html', '/signup.html', '/images/', '/styles/', '/scripts/'];
  const publicAPIPaths = ['/api/auth/login', '/api/auth/signup'];
  
  const isPublicPath = publicPaths.some(path => req.path.startsWith(path));
  const isPublicAPI = publicAPIPaths.includes(req.path);
  
  // Allow public paths and root
  if (isPublicPath || isPublicAPI || req.path === '/') {
    return next();
  }
  
  // Check if trying to access HTML pages or views
  const isHTMLPage = req.path.endsWith('.html') || req.path.startsWith('/views/');
  
  if (isHTMLPage) {
    // Must be authenticated to access any HTML page
    if (!req.session.user) {
      return res.redirect('/signin.html');
    }
    
    // Admin users can ONLY access admin.html
    if (req.session.user.role === 'admin') {
      if (req.path !== '/views/admin.html' && req.path !== '/admin.html') {
        return res.status(403).send('Access denied. Admin users can only access the admin panel.');
      }
    } else {
      // Regular users CANNOT access admin.html
      if (req.path === '/views/admin.html' || req.path === '/admin.html') {
        return res.status(403).send('Access denied. Admin privileges required.');
      }
    }
  }
  
  next();
});

app.use(express.static(path.join(__dirname, '../../public')));

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
  
  if (p === '/signin.html' || p === '/signup.html') {
    return res.sendFile(path.join(__dirname, '../../public/views', p));
  }
  
  if (!req.session.user) {
    return res.redirect('/signin.html');
  }
  
  if (p === '/views/admin.html' || p === '/admin.html') {
    if (req.session.user.role !== 'admin') {
      return res.status(403).send('Access denied. Admin privileges required.');
    }
    return res.sendFile(path.join(__dirname, '../../public/views/admin.html'));
  }
  
  if (p === '/profile-selection.html') {
    return res.sendFile(path.join(__dirname, '../../public/views', p));
  }
  
  // Check if requesting a specific view file
  if (p.startsWith('/views/') && p.endsWith('.html')) {
    const fileName = p.replace('/views/', '');
    return res.sendFile(path.join(__dirname, '../../public/views', fileName));
  }
  
  // Serve main app for authenticated users (fallback)
  res.sendFile(path.join(__dirname, '../../public/views', 'index.html'));
});

async function startServer() {
  try {
    await mongoose.connect(config.mongoUrl);
    console.log('✅ Connected to MongoDB');
    
    await seedDatabase();
    
    app.listen(config.port, () => {
      console.log(`🚀 Server running on http://localhost:${config.port}`);
      console.log(`📦 Environment: ${config.env}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
