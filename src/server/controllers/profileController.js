import User from '../models/User.js';

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
    res.json({ id: savedProfile._id.toString() });
  } catch (error) {
    console.error('Create profile error:', error);
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
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
