// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../models/User.js';
import { MovieDoc, SeriesDoc } from '../models/TitleDoc.js';
import { WatchHabitDoc } from '../models/WatchHabitsDoc.js';

/**
 * Seed example data: Users, Profiles, Watch Habits, and Likes
 * Run with: node src/server/config/seedExampleData.js
 */

const AVATARS = [
  '/images/avatar1.png',
  '/images/avatar2.png',
  '/images/avatar3.png',
  '/images/avatar4.png',
  '/images/avatar5.png'
];

const PROFILE_NAMES = [
  ['Alice', 'Bob', 'Charlie'],
  ['Emma', 'David', 'Sophia'],
  ['James', 'Olivia', 'Lucas'],
  ['Mia', 'Noah', 'Isabella']
];

/**
 * Stage 1: Create users with 3 profiles each
 */
export async function createUsers() {
  console.log('\n📝 Step 1: Creating users...');
  
  const users = [];
  const userData = [
    { username: 'user1', password: 'password123' },
    { username: 'user2', password: 'password123' },
    { username: 'user3', password: 'password123' },
    { username: 'user4', password: 'password123' }
  ];

  for (const data of userData) {
    let user = await User.findOne({ username: data.username });
    if (!user) {
      user = new User({
        username: data.username,
        password: data.password,
        role: 'user'
      });
      await user.save();
      console.log(`  ✓ Created user: ${data.username}`);
    } else {
      console.log(`  ⊙ User already exists: ${data.username}`);
    }
    
    // Check if user already has 3 profiles
    if (user.profiles.length >= 3) {
      console.log(`  ⊙ User ${data.username} already has ${user.profiles.length} profiles`);
      users.push(user);
      continue;
    }

    // Get profile names for this user
    const userIndex = userData.findIndex(u => u.username === data.username);
    const profileNames = PROFILE_NAMES[userIndex] || ['Profile 1', 'Profile 2', 'Profile 3'];
    
    // Add profiles until we have 3
    for (let j = user.profiles.length; j < 3; j++) {
      const profileData = {
        name: profileNames[j],
        avatarUrl: AVATARS[j % AVATARS.length]
      };
      user.addProfile(profileData);
    }
    
    await user.save();
    console.log(`  ✓ Created 3 profiles for user: ${data.username}`);
    console.log(`    Profiles: ${user.profiles.map(p => p.name).join(', ')}`);
    
    // Refresh user to get updated profiles with _id
    const updatedUser = await User.findById(user._id);
    users.push(updatedUser);
  }

  return users;
}

/**
 * Helper function to get random items from an array
 */
function getRandomItems(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Stage 2: Create watch habits with history
 */
export async function createWatchHabits(usersWithProfiles, movies, series) {
  console.log('\n📺 Step 2: Creating watch habits per profile...');
  
  const allTitles = [...movies, ...series];
  if (allTitles.length === 0) {
    console.log('  ⚠️  Skipping watch habits - no titles available');
    return;
  }

  let habitsCreated = 0;

  for (const user of usersWithProfiles) {
    const userId = user._id.toString();
    
    for (const profile of user.profiles) {
      const profileId = profile._id.toString();
      
      // Each profile watches 5-8 random titles
      const titlesToWatch = getRandomItems(allTitles, Math.floor(Math.random() * 4) + 5);
      
      for (const title of titlesToWatch) {
        const isMovie = title.type === 'movie';
        const totalDuration = isMovie ? 5400 : 1800; // Movies: 90min, Episodes: 30min
        const watchedDuration = Math.floor(totalDuration * (Math.random() * 0.7 + 0.1)); // 10-80% watched
        const completed = Math.random() > 0.6; // 40% chance of completion
        
        // Generate watch start time within last 7 days
        const daysAgo = Math.random() * 7;
        const watchStartTime = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        
        // Create watch history (1-3 sessions)
        const watchHistory = [];
        const numSessions = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < numSessions; i++) {
          const sessionStart = new Date(watchStartTime.getTime() + i * 3600000); // 1 hour apart
          const sessionDuration = Math.floor(watchedDuration / numSessions);
          const sessionEnd = new Date(sessionStart.getTime() + sessionDuration * 1000);
          
          watchHistory.push({
            watchedAt: sessionEnd,
            duration: sessionDuration,
            completed: i === numSessions - 1 ? completed : false,
            startedAt: sessionStart
          });
        }

        // Set lastWatchedAt to most recent watchHistory entry
        const lastWatchedAt = watchHistory[watchHistory.length - 1].watchedAt;

        if (isMovie) {
          // Movie watch habit
          await WatchHabitDoc.findOneAndUpdate(
            {
              userId,
              titleId: title.id,
              episodeId: null,
              profileId
            },
            {
              userId,
              titleId: title.id,
              episodeId: null,
              profileId,
              watchedDuration,
              totalDuration,
              completed,
              lastWatchedAt,
              watchCount: watchHistory.length,
              watchHistory,
              liked: false,
              updatedAt: lastWatchedAt
            },
            { upsert: true, new: true }
          );
          habitsCreated++;
        } else {
          // Series watch habit - watch 1-3 random episodes
          const episodes = title.episodes || [];
          if (episodes.length > 0) {
            const episodesToWatch = getRandomItems(episodes, Math.min(Math.floor(Math.random() * 3) + 1, episodes.length));
            
            for (const episode of episodesToWatch) {
              const episodeDuration = 1800; // 30 min per episode
              const episodeWatched = Math.floor(episodeDuration * (Math.random() * 0.8 + 0.1)); // 10-90% watched
              const episodeCompleted = Math.random() > 0.5; // 50% chance
              
              const episodeWatchStart = new Date(watchStartTime.getTime() + Math.random() * 3600000);
              const episodeWatchEnd = new Date(episodeWatchStart.getTime() + episodeWatched * 1000);
              
              await WatchHabitDoc.findOneAndUpdate(
                {
                  userId,
                  titleId: title.id,
                  episodeId: episode.id,
                  profileId
                },
                {
                  userId,
                  titleId: title.id,
                  episodeId: episode.id,
                  profileId,
                  watchedDuration: episodeWatched,
                  totalDuration: episodeDuration,
                  completed: episodeCompleted,
                  lastWatchedAt: episodeWatchEnd,
                  watchCount: 1,
                  watchHistory: [{
                    watchedAt: episodeWatchEnd,
                    duration: episodeWatched,
                    completed: episodeCompleted,
                    startedAt: episodeWatchStart
                  }],
                  liked: false, // Episode-level likes not used
                  updatedAt: episodeWatchEnd
                },
                { upsert: true, new: true }
              );
              habitsCreated++;
            }
          }
        }
      }
    }
  }

  console.log(`  ✓ Created ${habitsCreated} watch habits`);
}

/**
 * Stage 3: Create likes for genre statistics
 */
export async function createLikes(usersWithProfiles, movies, series) {
  console.log('\n❤️  Step 3: Creating likes for movies and series per profile...');
  
  const allTitles = [...movies, ...series];
  if (allTitles.length === 0) {
    console.log('  ⚠️  Skipping likes - no titles available');
    return;
  }

  let likesCreated = 0;

  for (const user of usersWithProfiles) {
    const userId = user._id.toString();
    
    for (const profile of user.profiles) {
      const profileId = profile._id.toString();
      
      // Each profile likes 3-6 random titles
      const titlesToLike = getRandomItems(allTitles, Math.floor(Math.random() * 4) + 3);
      
      for (const title of titlesToLike) {
        // Check if like already exists
        const existing = await WatchHabitDoc.findOne({
          userId,
          titleId: title.id,
          episodeId: null,
          profileId,
          liked: true
        });
        
        if (!existing) {
          await WatchHabitDoc.findOneAndUpdate(
            {
              userId,
              titleId: title.id,
              episodeId: null,
              profileId
            },
            {
              userId,
              titleId: title.id,
              episodeId: null,
              profileId,
              watchedDuration: 0,
              totalDuration: 0,
              completed: false,
              lastWatchedAt: new Date(),
              watchCount: 0,
              watchHistory: [],
              liked: true,
              updatedAt: new Date()
            },
            { upsert: true, new: true }
          );
          likesCreated++;
        }
      }
    }
  }

  console.log(`  ✓ Created ${likesCreated} likes`);
}

/**
 * Helper function to fetch existing titles from MongoDB
 */
async function getExistingTitles() {
  console.log('\n🎬 Fetching existing movies and series from MongoDB...');
  
  const movies = await MovieDoc.find().lean();
  const series = await SeriesDoc.find().lean();
  
  console.log(`  ✓ Found ${movies.length} movies`);
  console.log(`  ✓ Found ${series.length} series`);
  
  if (movies.length === 0 && series.length === 0) {
    console.log('  ⚠️  Warning: No movies or series found in database!');
    console.log('     Please add some titles first via admin panel.');
  }
  
  return { movies, series };
}

/**
 * Stage 4: Main function and CLI entry point
 */
async function main() {
  try {
    // Dynamically import config after dotenv has loaded
    const config = await import('../config/config.js');
    const configDefault = config.default;
    
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    console.log(`   Using connection: ${configDefault.mongoUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials
    await mongoose.connect(configDefault.mongoUrl);
    console.log('✅ Connected to MongoDB\n');
    
    // Step 1: Create users with profiles
    const usersWithProfiles = await createUsers();
    
    // Fetch existing titles
    const { movies, series } = await getExistingTitles();
    
    // Step 2: Create watch habits
    await createWatchHabits(usersWithProfiles, movies, series);
    
    // Step 3: Create likes
    await createLikes(usersWithProfiles, movies, series);
    
    // Summary
    console.log('\n✅ Seed data creation completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Users: ${usersWithProfiles.length}`);
    console.log(`   - Total Profiles: ${usersWithProfiles.reduce((sum, u) => sum + u.profiles.length, 0)}`);
    console.log(`   - Movies available: ${movies.length}`);
    console.log(`   - Series available: ${series.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run if executed directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('seedExampleData.js');

if (isMainModule) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

export default main;

