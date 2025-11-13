import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import dotenv from 'dotenv';

dotenv.config();

const OMDB_API_KEY = process.env.OMDB_API_KEY;
const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/disney-plus-mock';

const episodeSchema = new mongoose.Schema({
  id: String,
  season: Number,
  episodeNumber: Number,
  name: String,
  videoUrl: String,
  thumbnailUrl: String,
  rating: String
}, { _id: false });

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
  imdbRating: Number,
  createdAt: { type: Date, default: Date.now }
});

const seriesSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, default: 'series' },
  name: { type: String, required: true },
  year: Number,
  genres: [String],
  description: String,
  posterUrl: String,
  thumbnailUrl: String,
  imdbId: String,
  actors: String,
  imdbRating: Number,
  episodes: [episodeSchema],
  createdAt: { type: Date, default: Date.now }
});

const MovieDoc = mongoose.model('Movie', movieSchema, 'movies');
const SeriesDoc = mongoose.model('Series', seriesSchema, 'series');

const popularMovies = [
  'The Shawshank Redemption', 'The Godfather', 'The Dark Knight', 'Inception',
  'Forrest Gump', 'The Matrix', 'Interstellar', 'The Lion King',
  'Gladiator', 'The Avengers', 'Spider-Man', 'Iron Man',
  'Toy Story', 'Finding Nemo', 'Frozen', 'Moana',
  'The Conjuring', 'A Quiet Place', 'Get Out', 'It',
  'Pulp Fiction', 'Fight Club', 'Goodfellas', 'The Silence of the Lambs',
  'Saving Private Ryan', 'The Green Mile', 'Se7en', 'The Usual Suspects',
  'The Prestige', 'The Departed', 'Whiplash', 'The Pianist',
  'American History X', 'Memento', 'Casino', 'The Truman Show',
  'Eternal Sunshine', 'Shutter Island', 'The Sixth Sense', 'Black Swan',
  'Gone Girl', 'Prisoners', 'Nightcrawler', 'Drive',
  'Mad Max Fury Road', 'Dunkirk', 'Blade Runner 2049', 'Arrival',
  'The Social Network', 'Jojo Rabbit'
];

const popularSeries = [
  'Breaking Bad', 'Game of Thrones', 'Stranger Things', 'The Office',
  'Friends', 'The Mandalorian', 'The Crown', 'Peaky Blinders',
  'Succession', 'The Last of Us', 'The Wire', 'Sherlock',
  'Westworld', 'House of Cards', 'The Boys', 'Narcos',
  'Better Call Saul', 'Dark', 'Fargo', 'True Detective'
];

async function fetchFromOMDB(title, type) {
  try {
    const searchUrl = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(title)}&type=${type}`;
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.Response === 'False') {
      console.log(`Not found: ${title}`);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error fetching ${title}:`, error.message);
    return null;
  }
}

function mapGenres(genreString) {
  if (!genreString) return [];
  return genreString.split(',').map(g => g.trim().toLowerCase().replace(/\s+/g, '-'));
}

const shortSampleVideos = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4'
];

async function downloadVideo(videoUrl, index) {
  const videosDir = path.join(process.cwd(), 'public', 'uploads', 'videos');
  fs.mkdirSync(videosDir, { recursive: true });
  
  const filename = `video-${index}-${nanoid(6)}.mp4`;
  const filepath = path.join(videosDir, filename);
  
  try {
    console.log(`  Downloading video ${index}...`);
    const response = await fetch(videoUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(filepath, buffer);
    console.log(`  ✓ Video ${index} downloaded (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
    return `/uploads/videos/${filename}`;
  } catch (error) {
    console.error(`  ✗ Failed to download video ${index}:`, error.message);
    return videoUrl;
  }
}

async function saveMovie(data, videoUrl) {
  try {
    const posterBuffer = await downloadPoster(data.Poster);
    let posterUrl = '';
    let thumbnailUrl = '';
    
    if (posterBuffer) {
      const postersDir = path.join(process.cwd(), 'public', 'uploads', 'posters');
      const thumbnailDir = path.join(process.cwd(), 'public', 'uploads', 'thumbnail');
      fs.mkdirSync(postersDir, { recursive: true });
      fs.mkdirSync(thumbnailDir, { recursive: true });
      
      const posterFilename = `${Date.now()}-${nanoid(6)}.jpg`;
      const posterFilepath = path.join(postersDir, posterFilename);
      await fs.promises.writeFile(posterFilepath, posterBuffer);
      posterUrl = `/uploads/posters/${posterFilename}`;
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const thumbnailFilename = `${Date.now()}-${nanoid(6)}-thumb.jpg`;
      const thumbnailFilepath = path.join(thumbnailDir, thumbnailFilename);
      await fs.promises.writeFile(thumbnailFilepath, posterBuffer);
      thumbnailUrl = `/uploads/thumbnail/${thumbnailFilename}`;
    }

    const movie = new MovieDoc({
      id: `movie-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'movie',
      name: data.Title,
      year: parseInt(data.Year) || new Date().getFullYear(),
      genres: mapGenres(data.Genre),
      description: data.Plot || '',
      posterUrl: posterUrl || data.Poster,
      thumbnailUrl: thumbnailUrl || data.Poster,
      videoUrl: videoUrl,
      actors: data.Actors || '',
      imdbRating: parseFloat(data.imdbRating) || 0,
      createdAt: new Date()
    });

    await movie.save();
    console.log(`✓ Saved movie: ${data.Title}`);
  } catch (error) {
    console.error(`Error saving movie ${data.Title}:`, error.message);
  }
}

async function saveSeries(data, videoUrls, numEpisodes = 3) {
  try {
    const posterBuffer = await downloadPoster(data.Poster);
    let posterUrl = '';
    
    if (posterBuffer) {
      const postersDir = path.join(process.cwd(), 'public', 'uploads', 'posters');
      fs.mkdirSync(postersDir, { recursive: true });
      
      const posterFilename = `${Date.now()}-${nanoid(6)}.jpg`;
      const posterFilepath = path.join(postersDir, posterFilename);
      await fs.promises.writeFile(posterFilepath, posterBuffer);
      posterUrl = `/uploads/posters/${posterFilename}`;
    }

    const episodes = [];
    
    const thumbnailDir = path.join(process.cwd(), 'public', 'uploads', 'thumbnail');
    fs.mkdirSync(thumbnailDir, { recursive: true });
    
    for (let e = 1; e <= numEpisodes; e++) {
      let episodeThumbnailUrl = '';
      
      if (posterBuffer) {
        const epThumbFilename = `${Date.now()}-${nanoid(6)}-ep${e}-thumb.jpg`;
        const epThumbFilepath = path.join(thumbnailDir, epThumbFilename);
        await fs.promises.writeFile(epThumbFilepath, posterBuffer);
        episodeThumbnailUrl = `/uploads/thumbnail/${epThumbFilename}`;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const videoUrl = videoUrls[Math.floor(Math.random() * videoUrls.length)];
      
      episodes.push({
        id: `ep-1-${e}-${nanoid(6)}`,
        season: 1,
        episodeNumber: e,
        name: `Episode ${e}`,
        videoUrl: videoUrl,
        thumbnailUrl: episodeThumbnailUrl,
        rating: 'N/A'
      });
    }

    const series = new SeriesDoc({
      id: `series-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'series',
      name: data.Title,
      year: parseInt(data.Year) || new Date().getFullYear(),
      genres: mapGenres(data.Genre),
      description: data.Plot || '',
      posterUrl: posterUrl || data.Poster,
      thumbnailUrl: '',
      imdbId: data.imdbID,
      actors: data.Actors || '',
      imdbRating: parseFloat(data.imdbRating) || 0,
      episodes: episodes,
      createdAt: new Date()
    });

    await series.save();
    console.log(`✓ Saved series: ${data.Title} (with ${episodes.length} episodes)`);
  } catch (error) {
    console.error(`Error saving series ${data.Title}:`, error.message);
  }
}

async function downloadPoster(posterUrl) {
  if (!posterUrl || posterUrl === 'N/A') return null;
  
  try {
    const response = await fetch(posterUrl);
    if (!response.ok) return null;
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error downloading poster:', error.message);
    return null;
  }
}

async function main() {
  try {
    console.log('MONGO_URI:', MONGO_URI);
    console.log('OMDB_API_KEY:', OMDB_API_KEY ? 'Set' : 'Not set');
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('\n=== Clearing existing data ===');
    const deletedMovies = await MovieDoc.deleteMany({});
    const deletedSeries = await SeriesDoc.deleteMany({});
    console.log(`Deleted ${deletedMovies.deletedCount} movies`);
    console.log(`Deleted ${deletedSeries.deletedCount} series`);

    if (!OMDB_API_KEY) {
      console.error('OMDB_API_KEY not configured. Please set it in your environment.');
      process.exit(1);
    }

    console.log('\n=== Downloading sample videos ===');
    const videoUrls = [];
    for (let i = 0; i < shortSampleVideos.length; i++) {
      const localUrl = await downloadVideo(shortSampleVideos[i], i + 1);
      videoUrls.push(localUrl);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log(`\n✓ Downloaded ${videoUrls.length} videos`);

    console.log('\n=== Fetching and saving movies ===');
    let videoIndex = 0;
    for (const title of popularMovies) {
      const data = await fetchFromOMDB(title, 'movie');
      if (data) {
        const videoUrl = videoUrls[videoIndex % videoUrls.length];
        await saveMovie(data, videoUrl);
        videoIndex++;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n=== Fetching and saving series ===');
    const targetEpisodes = 70;
    const numSeries = popularSeries.length;
    const episodesPerSeries = [];
    
    let remainingEpisodes = targetEpisodes;
    for (let i = 0; i < numSeries; i++) {
      if (i === numSeries - 1) {
        episodesPerSeries.push(remainingEpisodes);
      } else {
        const min = 2;
        const max = Math.min(6, remainingEpisodes - (numSeries - i - 1) * 2);
        const episodes = Math.floor(Math.random() * (max - min + 1)) + min;
        episodesPerSeries.push(episodes);
        remainingEpisodes -= episodes;
      }
    }
    
    for (let i = 0; i < popularSeries.length; i++) {
      const title = popularSeries[i];
      const data = await fetchFromOMDB(title, 'series');
      if (data) {
        await saveSeries(data, videoUrls, episodesPerSeries[i]);
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n=== Summary ===');
    const movieCount = await MovieDoc.countDocuments();
    const seriesCount = await SeriesDoc.countDocuments();
    const allSeries = await SeriesDoc.find();
    const totalEpisodes = allSeries.reduce((sum, s) => sum + s.episodes.length, 0);
    console.log(`Total movies: ${movieCount}`);
    console.log(`Total series: ${seriesCount}`);
    console.log(`Total episodes: ${totalEpisodes}`);
    console.log('\nDatabase populated successfully!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
