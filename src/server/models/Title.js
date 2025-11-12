import { nanoid } from 'nanoid';

class Title {
  constructor() {
    this.titles = [];
  }

  seed() {
    const id1 = nanoid();
    this.titles.push({
      id: id1,
      type: 'movie',
      name: 'Demo Movie',
      year: 2024,
      genres: ['action'],
      description: 'A demo movie.',
      posterUrl: '/images/mainscreen.jpeg',
      videoUrl: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4'
    });

    const id2 = nanoid();
    this.titles.push({
      id: id2,
      type: 'series',
      name: 'Demo Series',
      year: 2023,
      genres: ['drama'],
      description: 'A demo series.',
      posterUrl: '/images/disney-interface.jpeg',
      episodes: [
        {
          id: nanoid(),
          season: 1,
          episodeNumber: 1,
          name: 'Pilot',
          videoUrl: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4'
        },
        {
          id: nanoid(),
          season: 1,
          episodeNumber: 2,
          name: 'Next',
          videoUrl: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4'
        }
      ]
    });
  }

  findAll(filters = {}) {
    let arr = this.titles.slice();

    if (filters.q) {
      arr = arr.filter(t =>
        t.name.toLowerCase().includes(String(filters.q).toLowerCase())
      );
    }

    if (filters.genre) {
      arr = arr.filter(t => (t.genres || []).includes(filters.genre));
    }

    // MongoDB ready: filter by type (series/movie)
    if (filters.type) {
      arr = arr.filter(t => t.type === filters.type);
    }

    return arr;
  }

  findById(id) {
    return this.titles.find(t => t.id === id);
  }

  findSimilar(titleId) {
    const title = this.findById(titleId);
    if (!title) return [];

    return this.titles
      .filter(t =>
        t.id !== titleId &&
        (t.genres || []).some(g => (title.genres || []).includes(g))
      );
  }

  create(titleData) {
    const title = {
      id: nanoid(),
      type: titleData.type,
      name: titleData.name,
      year: Number(titleData.year),
      genres: titleData.genres || [],
      description: titleData.description,
      posterUrl: titleData.posterUrl || '/images/mainscreen.jpeg',
      thumbnailUrl: titleData.thumbnailUrl || null
    };

    if (titleData.type === 'movie') {
      title.videoUrl = titleData.videoUrl || 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4';
    } else {
      title.episodes = titleData.episodes || [{
        id: nanoid(),
        season: 1,
        episodeNumber: 1,
        name: 'Episode 1',
        videoUrl: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4'
      }];
    }

    this.titles.push(title);
    return title;
  }

  getVideoUrl(titleId, episodeId = null) {
    const title = this.findById(titleId);
    if (!title) return null;

    if (episodeId && title.episodes) {
      const episode = title.episodes.find(e => e.id === episodeId);
      return episode ? episode.videoUrl : null;
    }

    return title.videoUrl || null;
  }

  getNextEpisode(titleId, currentEpisodeId = null) {
    const title = this.findById(titleId);
    if (!title || !title.episodes) return null;

    if (!currentEpisodeId) {
      return title.episodes[0];
    }

    const idx = title.episodes.findIndex(e => e.id === currentEpisodeId);
    return title.episodes[idx + 1] || null;
  }

  getAll() {
    return this.titles;
  }
}

export default new Title();
