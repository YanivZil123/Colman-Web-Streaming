export const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'auth' });
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'admin' });
  }
  next();
};

/**
 * isAdmin middleware: Checks if user is authenticated and has admin role
 * Redirects to /views/home.html if not admin, otherwise continues to next middleware
 */
export const isAdmin = async (req, res, next) => {
  try {
    // Check if session exists and has user
    if (!req.session || !req.session.user) {
      return res.redirect('/signin.html');
    }

    // Check if user has admin role
    if (req.session.user.role !== 'admin') {
      return res.redirect('/views/home.html');
    }

    // User is admin, continue to next middleware
    next();
  } catch (error) {
    console.error('Error in isAdmin middleware:', error);
    return res.redirect('/signin.html');
  }
};
