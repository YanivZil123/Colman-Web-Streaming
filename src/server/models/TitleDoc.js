import mongoose from 'mongoose';

const episodeSchema = new mongoose.Schema({
  id: String,
  season: Number,
  episodeNumber: Number,
  name: String,
  videoUrl: String
}, { _id: false });

const movieSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, default: 'movie' },
  name: { type: String, required: true },
  year: Number,
  genres: [String],
  description: String,
  posterUrl: String,
  videoUrl: String,
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
  episodes: [episodeSchema],
  createdAt: { type: Date, default: Date.now }
});

const MovieDoc = mongoose.model('Movie', movieSchema, 'movies');
const SeriesDoc = mongoose.model('Series', seriesSchema, 'series');

export { MovieDoc, SeriesDoc };
