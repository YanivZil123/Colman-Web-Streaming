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
