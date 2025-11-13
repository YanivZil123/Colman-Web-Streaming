import { WatchHabitDoc } from '../models/WatchHabitsDoc.js';

export const toggleLike = async (req, res) => {
  try {
    const { titleId, profileId } = req.body;
    
    if (!titleId || !profileId) {
      return res.status(400).json({ error: 'Title ID and Profile ID are required' });
    }

    const userId = req.session.user.id;
    
    const query = {
      userId,
      profileId: profileId || null,
      titleId,
      episodeId: null
    };
    
    let watchHabit = await WatchHabitDoc.findOne(query);
    
    if (!watchHabit) {
      watchHabit = await WatchHabitDoc.create({
        userId,
        profileId: profileId || null,
        titleId,
        episodeId: null,
        watchedDuration: 0,
        totalDuration: 0,
        completed: false,
        liked: true,
        watchCount: 0,
        watchHistory: []
      });
    } else {
      watchHabit.liked = !watchHabit.liked;
      watchHabit.updatedAt = new Date();
      await watchHabit.save();
    }
    
    res.json({ 
      ok: true, 
      liked: watchHabit.liked
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const checkLike = async (req, res) => {
  try {
    const { titleId, profileId } = req.query;
    
    if (!titleId || !profileId) {
      return res.status(400).json({ error: 'Title ID and Profile ID are required' });
    }

    const userId = req.session.user.id;
    
    const watchHabit = await WatchHabitDoc.findOne({
      userId,
      profileId: profileId || null,
      titleId,
      episodeId: null
    });
    
    const liked = watchHabit ? watchHabit.liked : false;
    
    res.json({ liked });
  } catch (error) {
    console.error('Check like error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfileLikes = async (req, res) => {
  try {
    const { profileId } = req.params;
    
    if (!profileId) {
      return res.status(400).json({ error: 'Profile ID is required' });
    }

    const userId = req.session.user.id;
    
    const likes = await WatchHabitDoc.find({
      userId,
      profileId: profileId || null,
      liked: true
    }).lean();
    
    res.json({ 
      items: likes,
      total: likes.length
    });
  } catch (error) {
    console.error('Get profile likes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

