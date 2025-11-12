class Genre {
  constructor() {
    this.genres = [
      { name: 'Action', slug: 'action' },
      { name: 'Drama', slug: 'drama' },
      { name: 'Kids', slug: 'kids' },
      { name: 'Comedy', slug: 'comedy' },
      { name: 'Horror', slug: 'horror' },
      { name: 'Cartoon', slug: 'cartoon' },
      { name: 'Sci-Fi', slug: 'sci-fi' },
      { name: 'Thriller', slug: 'thriller' }
    ];
  }

  getAll() {
    return this.genres;
  }

  findBySlug(slug) {
    return this.genres.find(g => g.slug === slug);
  }

  create(name, slug) {
    const genre = { name, slug };
    this.genres.push(genre);
    return genre;
  }
}

export default new Genre();
