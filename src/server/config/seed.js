import User from '../models/User.js';
import Title from '../models/Title.js';
import Catalogue from '../models/Catalogue.js';
import WatchHabits from '../models/WatchHabits.js';
import Like from '../models/Like.js';

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

  const existingAdmin = await User.findOne({ username: 'admin' });
  
  if (!existingAdmin) {
    const admin = new User({
      username: 'admin',
      password: 'admin1',
      role: 'admin',
      profiles: [{
        name: 'Admin',
        avatarUrl: '/images/avatar1.png'
      }]
    });
    await admin.save();
    console.log('Admin user created');
  }
  
  Title.seed();
  Catalogue.seed();
  WatchHabits.seed();
  Like.seed();
  console.log('Database seeded successfully');
}
