import { WatchHabitDoc } from '../models/WatchHabitsDoc.js';
import User from '../models/User.js';
import ErrorLog from '../models/ErrorLog.js';

export const getViewsByDay = (req, res) => {
  try {
    // Mock data - would come from database in production
    res.json({
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      counts: [2, 1, 3, 5, 2, 1, 4]
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPopularByGenre = (req, res) => {
  try {
    // Mock data - would come from database in production
    res.json({
      labels: ['Action', 'Drama', 'Kids'],
      values: [5, 3, 2]
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get aggregated daily watch data per profile
 * Groups by profileId and day, calculates total watched duration
 * Includes profile name via $lookup with User model
 */
export const getDailyWatchData = async (req, res, next) => {
  try {
    const data = await WatchHabitDoc.aggregate([
      // Filter out records without profileId
      {
        $match: {
          profileId: { $ne: null, $exists: true }
        }
      },
      // Unwind watch history to process each watch event
      {
        $unwind: {
          path: '$watchHistory',
          preserveNullAndEmptyArrays: true
        }
      },
      // Group by profileId and date
      {
        $group: {
          _id: {
            profileId: '$profileId',
            userId: '$userId',
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: { $ifNull: ['$watchHistory.watchedAt', '$lastWatchedAt'] }
              }
            }
          },
          totalWatchedDuration: {
            $sum: { $ifNull: ['$watchHistory.duration', '$watchedDuration'] }
          },
          watchCount: { $sum: 1 }
        }
      },
      // Sort by date ascending
      {
        $sort: { '_id.date': 1 }
      },
      // Lookup to get user and profile details
      {
        $lookup: {
          from: 'users',
          let: { userId: '$_id.userId', profileId: '$_id.profileId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: [{ $toString: '$_id' }, '$$userId'] }
              }
            },
            {
              $unwind: '$profiles'
            },
            {
              $match: {
                $expr: { $eq: [{ $toString: '$profiles._id' }, '$$profileId'] }
              }
            },
            {
              $project: { 
                username: 1, 
                profileName: '$profiles.name',
                profileAvatar: '$profiles.avatarUrl'
              }
            }
          ],
          as: 'profileData'
        }
      },
      // Unwind profile data
      {
        $unwind: {
          path: '$profileData',
          preserveNullAndEmptyArrays: true
        }
      },
      // Reshape output
      {
        $project: {
          _id: 0,
          profileId: '$_id.profileId',
          userId: '$_id.userId',
          date: '$_id.date',
          totalWatchedDuration: 1,
          watchCount: 1,
          username: { $ifNull: ['$profileData.username', 'Unknown'] },
          profileName: { $ifNull: ['$profileData.profileName', 'Unknown Profile'] }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: data,
      count: data.length
    });
  } catch (error) {
    console.error('Error in getDailyWatchData:', error);
    next(error);
  }
};
