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
 * Regular users see only their own profiles, admins see all users
 */
export const getDailyWatchData = async (req, res, next) => {
  try {
    console.log('=== Fetching daily watch data ===');
    
    const currentUserId = req.session.user.id;
    const isAdmin = req.session.user.role === 'admin';
    
    console.log(`User ID: ${currentUserId}, Is Admin: ${isAdmin}`);
    
    // Build query filter
    const watchHabitsQuery = { profileId: { $ne: null, $exists: true } };
    
    // If not admin, filter by current user's ID
    if (!isAdmin) {
      watchHabitsQuery.userId = currentUserId;
      console.log('Filtering watch habits for current user only');
    } else {
      console.log('Admin user - fetching all watch habits');
    }
    
    // Fetch watch habits based on query
    const allHabits = await WatchHabitDoc.find(watchHabitsQuery).lean();
    
    console.log(`Found ${allHabits.length} watch habits with profileId`);
    
    if (allHabits.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        count: 0,
        message: 'No watch data available. Start watching content to see statistics!'
      });
    }

    // Get user(s) with their profiles
    const User = (await import('../models/User.js')).default;
    const userQuery = isAdmin ? {} : { _id: currentUserId };
    const users = await User.find(userQuery).lean();
    
    // Create a map of profileId -> profile info
    const profileMap = {};
    users.forEach(user => {
      if (user.profiles && user.profiles.length > 0) {
        user.profiles.forEach(profile => {
          profileMap[profile._id.toString()] = {
            username: user.username,
            profileName: profile.name,
            profileAvatar: profile.avatarUrl
          };
        });
      }
    });

    console.log(`Built profile map with ${Object.keys(profileMap).length} profiles`);

    // Process each watch habit and aggregate by profile and date
    const aggregated = {};
    
    allHabits.forEach(habit => {
      const profileId = habit.profileId.toString();
      const profileInfo = profileMap[profileId] || { 
        username: 'Unknown', 
        profileName: 'Unknown Profile' 
      };
      
      // Process watch history events
      if (habit.watchHistory && habit.watchHistory.length > 0) {
        habit.watchHistory.forEach(event => {
          const date = new Date(event.watchedAt || event.startedAt || habit.lastWatchedAt);
          const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
          const duration = event.duration || 0;
          
          const key = `${profileId}-${dateStr}`;
          
          if (!aggregated[key]) {
            aggregated[key] = {
              profileId: profileId,
              date: dateStr,
              totalWatchedDuration: 0,
              watchCount: 0,
              username: profileInfo.username,
              profileName: profileInfo.profileName
            };
          }
          
          aggregated[key].totalWatchedDuration += duration;
          aggregated[key].watchCount += 1;
        });
      } else {
        // If no watch history, use the main record
        const date = new Date(habit.lastWatchedAt);
        const dateStr = date.toISOString().split('T')[0];
        const key = `${profileId}-${dateStr}`;
        
        if (!aggregated[key]) {
          aggregated[key] = {
            profileId: profileId,
            date: dateStr,
            totalWatchedDuration: 0,
            watchCount: 0,
            username: profileInfo.username,
            profileName: profileInfo.profileName
          };
        }
        
        aggregated[key].totalWatchedDuration += habit.watchedDuration || 0;
        aggregated[key].watchCount += 1;
      }
    });

    // Convert to array and sort by date
    const data = Object.values(aggregated).sort((a, b) => 
      a.date.localeCompare(b.date)
    );

    console.log(`Aggregated into ${data.length} records`);
    if (data.length > 0) {
      console.log('Sample record:', JSON.stringify(data[0], null, 2));
    }

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
