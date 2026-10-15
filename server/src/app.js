const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');

const healthRoutes = require('./routes/health');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN?.split(',') ?? '*',
      credentials: true,
    })
  );

  app.use(
    '/api',
    rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true })
  );

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };