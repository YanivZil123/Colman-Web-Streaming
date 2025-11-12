import User from '../models/User.js';

export const getProfiles = (req, res) => {
  try {
    const profiles = User.getProfiles(req.session.user.id);
    res.json({
      items: profiles.map(p => ({
        id: p.id,
        name: p.name,
        avatarUrl: p.avatarUrl
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createProfile = (req, res) => {
  try {
    const profile = User.addProfile(req.session.user.id, req.body);
    
    if (!profile) {
      return res.status(400).json({ error: 'limit' });
    }

    res.json({ id: profile.id });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteProfile = (req, res) => {
  try {
    User.deleteProfile(req.session.user.id, req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
