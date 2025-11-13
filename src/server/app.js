import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import config from './config/config.js';
import seedDatabase from './config/seed.js';
import registerRoutes from './routes/index.js';
import ErrorLog from './models/ErrorLog.js';

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
  // Public paths that don't require authentication
  const publicPaths = ['/signin.html', '/signup.html', '/images/', '/styles/', '/scripts/', '/assets/', '/uploads/'];
  const publicAPIPaths = ['/api/auth/login', '/api/auth/signup'];
  
  const isPublicPath = publicPaths.some(path => req.path.startsWith(path));
  const isPublicAPI = publicAPIPaths.includes(req.path);
  
  // Allow public paths, public APIs, and root
  if (isPublicPath || isPublicAPI || req.path === '/') {
    return next();
  }
  
  // Check if trying to access HTML pages or views directory
  const isHTMLPage = req.path.endsWith('.html') || req.path.startsWith('/views/');
  
  if (isHTMLPage) {
    // Must be authenticated to access any HTML page
    if (!req.session.user) {
      return res.redirect('/signin.html');
    }
    
    // Admin users can only access admin.html (not regular user pages)
    if (req.session.user.role === 'admin') {
      if (req.path !== '/views/admin.html' && req.path !== '/admin.html' &&
          req.path !== '/views/stats-dashboard.html' && req.path !== '/stats-dashboard.html') {
        return res.status(403).send('Access denied. Admin users can only access the admin panel.');
      }
    } else {
      // Regular users CANNOT access admin.html only
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

  if (p === '/views/stats-dashboard.html' || p === '/stats-dashboard.html') {
    // Any authenticated user can access stats dashboard (they see only their own data)
    if (!req.session.user) {
      return res.redirect('/signin.html');
    }
    return res.sendFile(path.join(__dirname, '../../public/views/stats-dashboard.html'));
  }
  
  if (p === '/profile-selection.html') {
    return res.sendFile(path.join(__dirname, '../../public/views', p));
  }
  
  // Handle title/player detail pages (used by links throughout the app)
  if (p === '/title.html') {
    return res.sendFile(path.join(__dirname, '../../public/views/title.html'));
  }
  if (p === '/player.html') {
    return res.sendFile(path.join(__dirname, '../../public/views/player.html'));
  }
  
  // Check if requesting a specific view file
  if (p.startsWith('/views/') && p.endsWith('.html')) {
    const fileName = p.replace('/views/', '');
    return res.sendFile(path.join(__dirname, '../../public/views', fileName));
  }
  
  // Serve main app for authenticated users (fallback)
  res.sendFile(path.join(__dirname, '../../public/views', 'index.html'));
});

/**
 * Global Error Handler Middleware
 * Captures all errors passed via next(err) and logs them to ErrorLog model
 * Must be defined after all other routes and middleware
 */
app.use(async (err, req, res, next) => {
  console.error('Global error handler caught:', err);

  try {
    // Log error to database
    const errorLog = new ErrorLog({
      message: err.message || 'Unknown error',
      stack: err.stack,
      endpoint: req.path,
      method: req.method,
      userId: req.session?.user?._id || req.session?.user?.id,
      timestamp: new Date()
    });

    await errorLog.save();
  } catch (logError) {
    console.error('Failed to log error to database:', logError);
  }

  // Send error response to client
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (req.path.startsWith('/api/')) {
    // API endpoint - return JSON
    return res.status(statusCode).json({
      error: message,
      success: false
    });
  } else {
    // HTML page - return error page
    return res.status(statusCode).send(`
      <html>
        <head>
          <title>Error</title>
          <style>
            body { 
              background: #1A1D29; 
              color: #fff; 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .error-container {
              text-align: center;
              padding: 20px;
            }
            h1 { font-size: 48px; margin: 0 0 10px; }
            p { font-size: 16px; color: #888; margin: 0 0 20px; }
            a { color: #00D6E8; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>${statusCode}</h1>
            <p>${message}</p>
            <a href="/">← Go Home</a>
          </div>
        </body>
      </html>
    `);
  }
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
