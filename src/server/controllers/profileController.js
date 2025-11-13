import User from '../models/User.js';
import logger from '../utils/logger.js';

export const getProfiles = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      items: user.profiles.map(p => ({
        id: p._id.toString(),
        name: p.name,
        avatarUrl: p.avatarUrl
      }))
    });
  } catch (error) {
    console.error('Get profiles error:', error);
    await logger.logError(error, req, 'getProfiles');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const profile = user.addProfile(req.body);
    
    if (!profile) {
      return res.status(400).json({ error: 'limit' });
    }

    await user.save();
    
    // Get the last profile from the array (the one we just added) which now has _id
    const savedProfile = user.profiles[user.profiles.length - 1];
    await logger.logCreate(req, 'profile', savedProfile._id.toString());
    res.json({ id: savedProfile._id.toString() });
  } catch (error) {
    console.error('Create profile error:', error);
    await logger.logError(error, req, 'createProfile');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.deleteProfile(req.params.id);
    await user.save();
    await logger.logDelete(req, 'profile', req.params.id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete profile error:', error);
    await logger.logError(error, req, 'deleteProfile');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const profile = user.updateProfile(req.params.id, req.body);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    await user.save();
    
    await logger.logUpdate(req, 'profile', req.params.id);
    
    res.json({ 
      id: profile._id.toString(),
      name: profile.name,
      avatarUrl: profile.avatarUrl
    });
  } catch (error) {
    console.error('Update profile error:', error);
    await logger.logError(error, req, 'updateProfile');
    res.status(500).json({ error: 'Internal server error' });
  }
};
