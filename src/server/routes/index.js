import authRoutes from './authRoutes.js';
import profileRoutes from './profileRoutes.js';
import titleRoutes from './titleRoutes.js';
import genreRoutes from './genreRoutes.js';
import watchRoutes from './watchRoutes.js';
import homeRoutes from './homeRoutes.js';
import adminRoutes from './adminRoutes.js';
import statsRoutes from './statsRoutes.js';
import likeRoutes from './likeRoutes.js';
import catalogueRoutes from './catalogueRoutes.js';
import watchHabitsRoutes from './watchHabitsRoutes.js';
import imdbRoutes from './imdbRoutes.js';
import contentRoutes from './contentRoutes.js';
import config from '../config/config.js';

export default function registerRoutes(app) {
  app.use('/api/auth', authRoutes);
  app.use('/api/profiles', profileRoutes);
  app.use('/api/titles', titleRoutes);
  app.use('/api/genres', genreRoutes);
  app.use('/api/watch', watchRoutes);
  app.use('/api/home', homeRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/likes', likeRoutes);
  app.use('/api/catalogues', catalogueRoutes);
  app.use('/api/watch-habits', watchHabitsRoutes);
  app.use('/api/imdb', imdbRoutes);
  app.use('/api/content', contentRoutes);
  app.get('/api/config/content-limit', (req, res) => {
    res.json({ limit: config.contentItemsPerSection });
  });
}
