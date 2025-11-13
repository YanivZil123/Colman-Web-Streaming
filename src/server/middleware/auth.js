import logger from '../utils/logger.js';

export const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    logger.logAuthFail(req, 'No session');
    return res.status(401).json({ error: 'auth' });
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    logger.logAuthFail(req, 'Not admin');
    return res.status(403).json({ error: 'admin' });
  }
  next();
};
