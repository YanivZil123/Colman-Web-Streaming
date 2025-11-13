import User from '../models/User.js';
import Title from '../models/Title.js';
import Catalogue from '../models/Catalogue.js';
import WatchHabits from '../models/WatchHabits.js';
import Like from '../models/Like.js';
import { WatchHabitDoc } from '../models/WatchHabitsDoc.js';

export default async function seedDatabase() {
  try {
    const indexes = await User.collection.getIndexes();
    if (indexes.email_1) {
      console.log('Dropping old email index...');
      await User.collection.dropIndex('email_1');
      console.log('Old email index dropped');
    }
  } catch (error) {
    console.log('No old email index to drop or error:', error.message);
  }

  // Create admin user (for content management only, no profiles for watching)
  let admin = await User.findOne({ username: 'admin' });
  if (!admin) {
    admin = new User({
      username: 'admin',
      password: 'admin1',
      role: 'admin',
      profiles: [] // Admin has no viewing profiles
    });
    await admin.save();
    console.log('Admin user created (content manager)');
  }
  
  // Create regular users with profiles for watch history
  let regularUser = await User.findOne({ username: 'testuser' });
  if (!regularUser) {
    regularUser = new User({
      username: 'testuser',
      password: 'test123',
      role: 'user',
      profiles: [
        { name: 'John', avatarUrl: '/images/avatar1.png' },
        { name: 'Sarah', avatarUrl: '/images/avatar2.png' },
        { name: 'Mike', avatarUrl: '/images/avatar3.png' }
      ]
    });
    await regularUser.save();
    console.log('Regular user created with 3 profiles');
    regularUser = await User.findById(regularUser._id);
  }
  
  Title.seed();
  Catalogue.seed();
  WatchHabits.seed();
  Like.seed();
  
  // Seed MongoDB WatchHabitsDoc with sample watch history for regular user profiles
  if (regularUser && regularUser.profiles && regularUser.profiles.length > 0) {
    await seedWatchHistory(regularUser);
  } else {
    console.log('⚠️ No user profiles found for watch history seeding');
  }
  
  console.log('Database seeded successfully');
}

async function seedWatchHistory(user) {
  // Clear existing watch history to reseed with fresh data
  await WatchHabitDoc.deleteMany({});
  console.log('Cleared existing watch history');
  
  // Get titles from in-memory Title model
  const titles = Title.findAll();
  if (titles.length === 0) {
    console.log('No titles found for watch history seeding');
    return;
  }
  
  const userId = user._id.toString();
  const watchHistoryData = [];
  const now = new Date();
  
  // Create watch history for each profile
  for (const profile of user.profiles) {
    const profileId = profile._id.toString();
    const profileName = profile.name;
    
    // Create watch history for the past 7 days
    for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      
      // Each profile watches 2-4 titles per day with different patterns
      const watchEventsPerDay = Math.floor(Math.random() * 3) + 2; // 2-4 events
      
      for (let i = 0; i < watchEventsPerDay; i++) {
        const randomTitle = titles[Math.floor(Math.random() * titles.length)];
        const watchDuration = Math.floor(Math.random() * 3600) + 300; // 5min to 1hr
        const totalDuration = watchDuration + Math.floor(Math.random() * 1800); // Total is longer
        const completed = Math.random() > 0.3; // 70% completion rate
        
        // Random time during the day
        const watchTime = new Date(date);
        watchTime.setHours(Math.floor(Math.random() * 24));
        watchTime.setMinutes(Math.floor(Math.random() * 60));
        
        const watchEvent = {
          userId,
          titleId: randomTitle.id,
          episodeId: randomTitle.type === 'series' && randomTitle.episodes?.length 
            ? randomTitle.episodes[0].id 
            : null,
          profileId,
          watchedDuration: watchDuration,
          totalDuration,
          completed,
          lastWatchedAt: watchTime,
          watchCount: 1,
          watchHistory: [{
            watchedAt: watchTime,
            duration: watchDuration,
            completed,
            startedAt: new Date(watchTime.getTime() - watchDuration * 1000)
          }],
          liked: false,
          createdAt: watchTime,
          updatedAt: watchTime
        };
        
        watchHistoryData.push(watchEvent);
      }
    }
    
    console.log(`✅ Created watch history for profile: ${profileName}`);
  }
  
  // Insert all watch history documents
  await WatchHabitDoc.insertMany(watchHistoryData);
  console.log(`✅ Total ${watchHistoryData.length} watch history entries created for past 7 days`);
}
