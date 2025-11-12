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

export default function registerRoutes(app) {
  app.use('/auth', authRoutes);
  app.use('/profiles', profileRoutes);
  app.use('/titles', titleRoutes);
  app.use('/genres', genreRoutes);
  app.use('/watch', watchRoutes);
  app.use('/home', homeRoutes);
  app.use('/admin', adminRoutes);
  app.use('/stats', statsRoutes);
  app.use('/likes', likeRoutes);
  app.use('/catalogues', catalogueRoutes);
  app.use('/watch-habits', watchHabitsRoutes);
}
