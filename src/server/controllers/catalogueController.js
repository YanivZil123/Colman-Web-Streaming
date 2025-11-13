import Catalogue from '../models/Catalogue.js';

/**
 * Get all catalogues with optional filters
 */
export const getCatalogues = (req, res) => {
  try {
    const { userId, isPublic, search, page = '1', limit = '20' } = req.query;
    
    const filters = {};
    if (userId) filters.userId = userId;
    if (isPublic !== undefined) filters.isPublic = isPublic === 'true';
    if (search) filters.search = search;

    let catalogues = Catalogue.findAll(filters);
    
    // Pagination
    const MAX_LIMIT = 100;
    const MAX_PAGE = 1000;
    const pageNum = Math.max(1, Math.min(parseInt(page), MAX_PAGE));
    const limitNum = Math.min(parseInt(limit), MAX_LIMIT);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedResults = catalogues.slice(startIndex, endIndex);
    
    res.json({
      items: paginatedResults,
      total: catalogues.length,
      page: pageNum,
      totalPages: Math.ceil(catalogues.length / limitNum)
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get catalogue by ID
 */
export const getCatalogueById = (req, res) => {
  try {
    const catalogue = Catalogue.findById(req.params.id);
    
    if (!catalogue) {
      return res.status(404).json({ error: 'Catalogue not found' });
    }
    
    res.json(catalogue);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create new catalogue
 */
export const createCatalogue = (req, res) => {
  try {
    const { name, description, titleIds, isPublic } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const catalogueData = {
      name,
      description,
      titleIds: titleIds || [],
      userId: req.session.user.id,
      isPublic: isPublic !== undefined ? isPublic : true
    };
    
    const catalogue = Catalogue.create(catalogueData);
    res.status(201).json(catalogue);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update catalogue
 */
export const updateCatalogue = (req, res) => {
  try {
    const catalogue = Catalogue.findById(req.params.id);
    
    if (!catalogue) {
      return res.status(404).json({ error: 'Catalogue not found' });
    }
    
    // Check ownership
    if (catalogue.userId !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const { name, description, titleIds, isPublic } = req.body;
    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (titleIds !== undefined) updateData.titleIds = titleIds;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    
    const updated = Catalogue.update(req.params.id, updateData);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete catalogue
 */
export const deleteCatalogue = (req, res) => {
  try {
    const catalogue = Catalogue.findById(req.params.id);
    
    if (!catalogue) {
      return res.status(404).json({ error: 'Catalogue not found' });
    }
    
    // Check ownership
    if (catalogue.userId !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const deleted = Catalogue.delete(req.params.id);
    
    if (deleted) {
      res.json({ ok: true, message: 'Catalogue deleted' });
    } else {
      res.status(404).json({ error: 'Catalogue not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Add title to catalogue
 */
export const addTitleToCatalogue = (req, res) => {
  try {
    const { titleId } = req.body;
    
    if (!titleId) {
      return res.status(400).json({ error: 'Title ID is required' });
    }
    
    const catalogue = Catalogue.findById(req.params.id);
    
    if (!catalogue) {
      return res.status(404).json({ error: 'Catalogue not found' });
    }
    
    // Check ownership
    if (catalogue.userId !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const updated = Catalogue.addTitle(req.params.id, titleId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Remove title from catalogue
 */
export const removeTitleFromCatalogue = (req, res) => {
  try {
    const { titleId } = req.params;
    
    const catalogue = Catalogue.findById(req.params.id);
    
    if (!catalogue) {
      return res.status(404).json({ error: 'Catalogue not found' });
    }
    
    // Check ownership
    if (catalogue.userId !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const updated = Catalogue.removeTitle(req.params.id, titleId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
