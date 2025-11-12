import ErrorLog from '../models/ErrorLog.js';
import config from '../config/config.js';

export const searchTitle = async (req, res) => {
  try {
    const { name, type } = req.query;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Title name must be at least 2 characters' });
    }

    if (!config.omdbApiKey) {
      return res.status(500).json({ error: 'OMDB API key not configured. Please set OMDB_API_KEY environment variable.' });
    }

    const omdbType = (type || '').toLowerCase() === 'series' ? 'series' : 'movie';

    const searchUrl = `https://www.omdbapi.com/?apikey=${config.omdbApiKey}&s=${encodeURIComponent(name)}&type=${omdbType}`;

    console.log('OMDB search URL:', searchUrl.replace(config.omdbApiKey, 'KEY_HIDDEN'));

    const searchRes = await fetch(searchUrl, { timeout: 5000 });
    const searchData = await searchRes.json();

    console.log('OMDB search response:', searchData);

    if (searchData.Response === 'False' || !searchData.Search || searchData.Search.length === 0) {
      console.log('No results found for:', name);
      return res.status(404).json({ error: 'Title not found on IMDB' });
    }

    const firstResult = searchData.Search[0];
    const detailUrl = `https://www.omdbapi.com/?apikey=${config.omdbApiKey}&i=${firstResult.imdbID}&type=${omdbType}`;

    console.log('OMDB detail URL:', detailUrl.replace(config.omdbApiKey, 'KEY_HIDDEN'));

    const detailRes = await fetch(detailUrl, { timeout: 5000 });
    const detailData = await detailRes.json();

    console.log('OMDB detail response:', detailData);

    if (detailData.Response === 'False' || !detailData.Title) {
      return res.status(404).json({ error: 'Could not fetch details from IMDB' });
    }

    res.json({
      found: true,
      title: detailData.Title,
      year: detailData.Year,
      rating: detailData.imdbRating || 'N/A',
      imdbId: detailData.imdbID,
      type: detailData.Type,
      plot: detailData.Plot,
      poster: detailData.Poster,
      genre: detailData.Genre || '',
      runtime: detailData.Runtime || '',
      director: detailData.Director || '',
      actors: detailData.Actors || '',
      rated: detailData.Rated || '',
      language: detailData.Language || '',
      country: detailData.Country || ''
    });
  } catch (error) {
    console.error('IMDB search error:', error);
    await ErrorLog.create({
      message: error.message,
      stack: error.stack,
      endpoint: '/api/imdb/search',
      method: 'GET'
    }).catch(() => {});
    res.status(500).json({ error: 'Failed to search IMDB: ' + error.message });
  }
};

export const getEpisode = async (req, res) => {
  try {
    const { imdbId, season, episode } = req.query;

    if (!imdbId || !season || !episode) {
      return res.status(400).json({ error: 'imdbId, season, and episode are required' });
    }

    if (!config.omdbApiKey) {
      return res.status(500).json({ error: 'OMDB API key not configured. Please set OMDB_API_KEY environment variable.' });
    }

    const episodeUrl = `https://www.omdbapi.com/?apikey=${config.omdbApiKey}&i=${imdbId}&Season=${season}&Episode=${episode}`;

    console.log('OMDB episode URL:', episodeUrl.replace(config.omdbApiKey, 'KEY_HIDDEN'));

    const episodeRes = await fetch(episodeUrl, { timeout: 5000 });
    const episodeData = await episodeRes.json();

    console.log('OMDB episode response:', episodeData);

    if (episodeData.Response === 'False') {
      return res.status(404).json({ error: episodeData.Error || 'Episode not found on IMDB' });
    }

    res.json({
      found: true,
      title: episodeData.Title || `Episode ${episode}`,
      season: parseInt(season),
      episode: parseInt(episode),
      rating: episodeData.imdbRating || 'N/A',
      plot: episodeData.Plot || '',
      released: episodeData.Released || '',
      runtime: episodeData.Runtime || '',
      imdbId: episodeData.imdbID || ''
    });
  } catch (error) {
    console.error('IMDB episode fetch error:', error);
    await ErrorLog.create({
      message: error.message,
      stack: error.stack,
      endpoint: '/api/imdb/episode',
      method: 'GET'
    }).catch(() => {});
    res.status(500).json({ error: 'Failed to fetch episode from IMDB: ' + error.message });
  }
};
