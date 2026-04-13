const express = require('express');
const mongoose = require('mongoose');

const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { client, register, metricsMiddleware } = require('./metrics');
const { getBreakerStats } = require('./utils/resilience');

const coreAuthRouter = require('./routes/coreRoutes/coreAuth');
const coreApiRouter = require('./routes/coreRoutes/coreApi');
const coreDownloadRouter = require('./routes/coreRoutes/coreDownloadRouter');
const corePublicRouter = require('./routes/coreRoutes/corePublicRouter');
const adminAuth = require('./controllers/coreControllers/adminAuth');

const errorHandlers = require('./handlers/errorHandlers');
const erpApiRouter = require('./routes/appRoutes/appApi');

const fileUpload = require('express-fileupload');
// create our Express app
const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(compression());

// // default options
// app.use(fileUpload());

// Устанавливаем метрики HTTP запросов
app.use(metricsMiddleware);

// Запрос на метрики
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Here our API Routes

app.use('/api', coreAuthRouter);
app.use('/api', adminAuth.isValidAuthToken, coreApiRouter);
app.use('/api', adminAuth.isValidAuthToken, erpApiRouter);
app.use('/download', coreDownloadRouter);
app.use('/public', corePublicRouter);

// Health check endpoint — reports DB and circuit breaker states
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  const breakers = getBreakerStats();
  const dbHealthy = dbState === 1;
  const allBreakersHealthy = Object.values(breakers).every((b) => b.state !== 'open');
  const healthy = dbHealthy && allBreakersHealthy;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: { state: dbStateMap[dbState] || 'unknown', healthy: dbHealthy },
    circuitBreakers: breakers,
  });
});

// If that above routes didnt work, we 404 them and forward to error handler
app.use(errorHandlers.notFound);

// production error handler
app.use(errorHandlers.productionErrors);

// done! we export it so we can start the site in start.js
module.exports = app;
