const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const authRoutes = require('./modules/auth/auth.routes');
const pricingRoutes = require('./modules/pricing/pricing.routes');
const gpsRoutes = require('./modules/gps/gps.routes');
const usersRoutes = require('./modules/users/users.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { loginLimiter } = require('./middleware/rateLimit');

const app = express();

app.use(cors({ origin: env.frontendOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/users', usersRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
