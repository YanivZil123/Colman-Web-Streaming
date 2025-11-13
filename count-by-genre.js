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

async function countByGenre() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    
    const movies = await MovieDoc.find({}).select('genres').lean();
    
    const genreCount = {};
    movies.forEach(movie => {
      if (movie.genres && Array.isArray(movie.genres)) {
        movie.genres.forEach(genre => {
          genreCount[genre] = (genreCount[genre] || 0) + 1;
        });
      }
    });
    
    const sortedGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1]);
    
    console.log('\nMovie count by genre:');
    sortedGenres.forEach(([genre, count]) => {
      console.log(`${genre}: ${count} movies`);
    });
    
    console.log(`\nGenre with most movies: ${sortedGenres[0][0]} (${sortedGenres[0][1]} movies)`);
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

countByGenre();
