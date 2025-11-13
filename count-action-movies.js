import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/disney-plus-mock';

const movieSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, default: 'movie' },
  name: { type: String, required: true },
  year: Number,
  genres: [String],
  description: String,
  posterUrl: String,
  thumbnailUrl: String,
  videoUrl: String,
  actors: String,
  createdAt: { type: Date, default: Date.now }
});

const MovieDoc = mongoose.model('Movie', movieSchema, 'movies');

async function countActionMovies() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    
    const count = await MovieDoc.countDocuments({ genres: 'action' });
    console.log(`\nTotal action movies: ${count}`);
    
    const actionMovies = await MovieDoc.find({ genres: 'action' }).select('name year genres').lean();
    console.log('\nAction movies:');
    actionMovies.forEach((movie, index) => {
      console.log(`${index + 1}. ${movie.name} (${movie.year})`);
    });
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

countActionMovies();
