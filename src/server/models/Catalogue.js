import { nanoid } from 'nanoid';

class Catalogue {
  constructor() {
    this.catalogues = [];
  }

  /**
   * Create a new catalogue
   * @param {Object} catalogueData - { name, description, titleIds, userId, isPublic }
   * @returns {Object} Created catalogue
   */
  create(catalogueData) {
    const catalogue = {
      id: nanoid(),
      name: catalogueData.name,
      description: catalogueData.description || '',
      titleIds: catalogueData.titleIds || [],
      userId: catalogueData.userId,
      isPublic: catalogueData.isPublic !== undefined ? catalogueData.isPublic : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.catalogues.push(catalogue);
    return catalogue;
  }

  /**
   * Find all catalogues with optional filters
   * @param {Object} filters - { userId, isPublic, search }
   * @returns {Array} Array of catalogues
   */
  findAll(filters = {}) {
    let results = this.catalogues.slice();

    // Filter by userId
    if (filters.userId) {
      results = results.filter(c => c.userId === filters.userId);
    }

    // Filter by public/private
    if (filters.isPublic !== undefined) {
      results = results.filter(c => c.isPublic === filters.isPublic);
    }

    // Search by name (main search field)
    if (filters.search) {
      const searchLower = String(filters.search).toLowerCase();
      results = results.filter(c =>
        c.name.toLowerCase().includes(searchLower) ||
        (c.description && c.description.toLowerCase().includes(searchLower))
      );
    }

    return results;
  }

  /**
   * Find catalogue by ID
   * @param {string} id - Catalogue ID
   * @returns {Object|null} Catalogue or null
   */
  findById(id) {
    return this.catalogues.find(c => c.id === id) || null;
  }

  /**
   * Update catalogue
   * @param {string} id - Catalogue ID
   * @param {Object} updateData - Fields to update
   * @returns {Object|null} Updated catalogue or null
   */
  update(id, updateData) {
    const catalogue = this.findById(id);
    if (!catalogue) return null;

    if (updateData.name !== undefined) catalogue.name = updateData.name;
    if (updateData.description !== undefined) catalogue.description = updateData.description;
    if (updateData.titleIds !== undefined) catalogue.titleIds = updateData.titleIds;
    if (updateData.isPublic !== undefined) catalogue.isPublic = updateData.isPublic;
    
    catalogue.updatedAt = new Date().toISOString();
    
    return catalogue;
  }

  /**
   * Delete catalogue by ID
   * @param {string} id - Catalogue ID
   * @returns {boolean} True if deleted, false otherwise
   */
  delete(id) {
    const index = this.catalogues.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    this.catalogues.splice(index, 1);
    return true;
  }

  /**
   * Add title to catalogue
   * @param {string} catalogueId - Catalogue ID
   * @param {string} titleId - Title ID to add
   * @returns {Object|null} Updated catalogue or null
   */
  addTitle(catalogueId, titleId) {
    const catalogue = this.findById(catalogueId);
    if (!catalogue) return null;

    if (!catalogue.titleIds.includes(titleId)) {
      catalogue.titleIds.push(titleId);
      catalogue.updatedAt = new Date().toISOString();
    }

    return catalogue;
  }

  /**
   * Remove title from catalogue
   * @param {string} catalogueId - Catalogue ID
   * @param {string} titleId - Title ID to remove
   * @returns {Object|null} Updated catalogue or null
   */
  removeTitle(catalogueId, titleId) {
    const catalogue = this.findById(catalogueId);
    if (!catalogue) return null;

    catalogue.titleIds = catalogue.titleIds.filter(id => id !== titleId);
    catalogue.updatedAt = new Date().toISOString();

    return catalogue;
  }

  /**
   * Get all catalogues
   * @returns {Array} All catalogues
   */
  getAll() {
    return this.catalogues;
  }

  /**
   * Seed initial data
   */
  seed() {
    // Add some sample catalogues if needed
    if (this.catalogues.length === 0) {
      this.create({
        name: 'Action Favorites',
        description: 'My favorite action movies and series',
        titleIds: [],
        userId: 'sample-user-id',
        isPublic: true
      });
    }
  }
}

export default new Catalogue();
