import express from 'express';
import * as catalogueController from '../controllers/catalogueController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all catalogues (with search support)
router.get('/', catalogueController.getCatalogues);

// Get catalogue by ID
router.get('/:id', catalogueController.getCatalogueById);

// Create new catalogue (requires authentication)
router.post('/', requireAuth, catalogueController.createCatalogue);

// Update catalogue (requires authentication)
router.put('/:id', requireAuth, catalogueController.updateCatalogue);

// Delete catalogue (requires authentication)
router.delete('/:id', requireAuth, catalogueController.deleteCatalogue);

// Add title to catalogue (requires authentication)
router.post('/:id/titles', requireAuth, catalogueController.addTitleToCatalogue);

// Remove title from catalogue (requires authentication)
router.delete('/:id/titles/:titleId', requireAuth, catalogueController.removeTitleFromCatalogue);

export default router;
