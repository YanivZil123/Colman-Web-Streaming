import User from '../models/User.js';
import ErrorLog from '../models/ErrorLog.js';

export const signup = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const user = new User({ username, password });
    await user.save();

    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      role: user.role
    };

    res.json({ ok: true });
  } catch (error) {
    console.error('Signup error:', error);
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
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await User.findOne({ username });

    if (!user || !(await user.verifyPassword(password))) {
      await ErrorLog.create({
        message: 'Failed login attempt',
        endpoint: '/api/auth/login',
        method: 'POST',
        userId: username
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      role: user.role
    };

    res.json({ ok: true });
  } catch (error) {
    console.error('Login error:', error);
    await ErrorLog.create({
      message: error.message,
      stack: error.stack,
      endpoint: '/api/auth/login',
      method: 'POST'
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
};

export const getMe = (req, res) => {
  res.json(req.session.user || null);
};
