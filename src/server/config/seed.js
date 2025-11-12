import User from '../models/User.js';
import Title from '../models/Title.js';
import Catalogue from '../models/Catalogue.js';
import WatchHabits from '../models/WatchHabits.js';

export default async function seedDatabase() {
  await User.seed();
  Title.seed();
  Catalogue.seed();
  WatchHabits.seed();
  console.log('Database seeded successfully');
}
