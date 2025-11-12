export default {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  env: process.env.NODE_ENV || 'development',
  mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/colman-web-streaming',
  omdbApiKey: process.env.OMDB_API_KEY || '6234490f'
};
