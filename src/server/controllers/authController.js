import User from '../models/User.js';
import ErrorLog from '../models/ErrorLog.js';
import logger from '../utils/logger.js';

export const signup = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      await logger.logValidationFail(req, ['Username and password required']);
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (username.trim().length < 3) {
      await logger.logValidationFail(req, ['Username must be at least 3 characters']);
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 6) {
      await logger.logValidationFail(req, ['Password must be at least 6 characters']);
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      await logger.logValidationFail(req, ['Username already exists']);
      return res.status(409).json({ error: 'Username already exists' });
    }

    const user = new User({ username, password });
    await user.save();

    await logger.logSignup(req, username);

    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      role: user.role
    };

    res.json({ ok: true });
  } catch (error) {
    console.error('Signup error:', error);
    await logger.logError(error, req, 'signup');
    await ErrorLog.create({
      message: error.message,
      stack: error.stack,
      endpoint: '/api/auth/signup',
      method: 'POST'
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      await logger.logValidationFail(req, ['Username and password required']);
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await User.findOne({ username });

    if (!user || !(await user.verifyPassword(password))) {
      await logger.logLogin(req, username, false);
      await ErrorLog.create({
        message: 'Failed login attempt',
        endpoint: '/api/auth/login',
        method: 'POST',
        userId: username
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await logger.logLogin(req, username, true);

    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      role: user.role
    };

    res.json({ ok: true });
  } catch (error) {
    console.error('Login error:', error);
    await logger.logError(error, req, 'login');
    await ErrorLog.create({
      message: error.message,
      stack: error.stack,
      endpoint: '/api/auth/login',
      method: 'POST'
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = async (req, res) => {
  await logger.logLogout(req);
  req.session.destroy(() => res.json({ ok: true }));
};

export const getMe = (req, res) => {
  res.json(req.session.user || null);
};
