export default {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret',
  env: process.env.NODE_ENV || 'development'
};
