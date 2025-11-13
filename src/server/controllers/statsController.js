import { WatchHabitDoc } from '../models/WatchHabitsDoc.js';
import { MovieDoc, SeriesDoc } from '../models/TitleDoc.js';
import User from '../models/User.js';

export const getViewsByDay = (req, res) => {
  try {
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
    res.json({
      labels: ['Action', 'Drama', 'Kids'],
      values: [5, 3, 2]
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyStats = async (req, res) => {
  try {
    const userId = req.session.user.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profileMap = {};
    user.profiles.forEach(profile => {
      profileMap[profile._id.toString()] = profile.name;
    });

    const dailyWatchesRaw = await WatchHabitDoc.aggregate([
      { $match: { userId: userId } },
      {
        $facet: {
          historyWatches: [
            { $unwind: '$watchHistory' },
            {
              $project: {
                profileId: 1,
                date: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$watchHistory.watchedAt'
                  }
                }
              }
            }
          ],
          habitWatches: [
            {
              $match: {
                lastWatchedAt: { $exists: true }
              }
            },
            {
              $project: {
                profileId: 1,
                date: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$lastWatchedAt'
                  }
                }
              }
            }
          ]
        }
      },
      {
        $project: {
          combined: { $concatArrays: ['$historyWatches', '$habitWatches'] }
        }
      },
      { $unwind: '$combined' },
      {
        $group: {
          _id: { 
            date: '$combined.date', 
            profileId: '$combined.profileId' 
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    const dailyWatches = dailyWatchesRaw.map(item => ({
      date: item._id.date,
      profile: profileMap[item._id.profileId] || 'Unknown Profile',
      count: item.count
    }));

    const likedTitles = await WatchHabitDoc.aggregate([
      {
        $match: {
          liked: true,
          $or: [
            { episodeId: null },
            { episodeId: { $exists: false } }
          ]
        }
      },
      {
        $group: {
          _id: '$titleId',
          likeCount: { $sum: 1 }
        }
      },
      {
        $sort: { likeCount: -1 }
      }
    ]);

    const titleIds = likedTitles.map(item => item._id);

    const movies = await MovieDoc.find({ id: { $in: titleIds } }).select('genres');
    const series = await SeriesDoc.find({ id: { $in: titleIds } }).select('genres');

    const allContent = [...movies, ...series];

    const genreCounts = {};
    allContent.forEach(content => {
      if (content.genres && Array.isArray(content.genres)) {
        content.genres.forEach(genre => {
          const genreKey = genre.charAt(0).toUpperCase() + genre.slice(1).toLowerCase();
          genreCounts[genreKey] = (genreCounts[genreKey] || 0) + 1;
        });
      }
    });

    const genrePopularity = Object.keys(genreCounts).map(genre => ({
      genre: genre,
      count: genreCounts[genre]
    })).sort((a, b) => b.count - a.count);

    res.json({
      dailyWatches: dailyWatches,
      genrePopularity: genrePopularity
    });
  } catch (error) {
    console.error('Error in getMyStats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
