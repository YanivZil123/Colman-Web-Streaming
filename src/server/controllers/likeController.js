import Like from '../models/Like.js';

export const toggleLike = (req, res) => {
  try {
    const { titleId, profileId } = req.body;
    
    if (!titleId || !profileId) {
      return res.status(400).json({ error: 'Title ID and Profile ID are required' });
    }

    const userId = req.session.user.id;
    const result = Like.toggle({ userId, profileId, titleId });
    
    res.json({ 
      ok: true, 
      liked: result.liked,
      like: result.like
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const checkLike = (req, res) => {
  try {
    const { titleId, profileId } = req.query;
    
    if (!titleId || !profileId) {
      return res.status(400).json({ error: 'Title ID and Profile ID are required' });
    }

    const userId = req.session.user.id;
    const liked = Like.isLiked(userId, profileId, titleId);
    
    res.json({ liked });
  } catch (error) {
    console.error('Check like error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfileLikes = (req, res) => {
  try {
    const { profileId } = req.params;
    
    if (!profileId) {
      return res.status(400).json({ error: 'Profile ID is required' });
    }

    const userId = req.session.user.id;
    const likes = Like.getByProfile(userId, profileId);
    
    res.json({ 
      items: likes,
      total: likes.length
    });
  } catch (error) {
    console.error('Get profile likes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

