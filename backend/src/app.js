require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { apiLimiter, authLimiter, transferLimiter } = require('./middleware/rateLimit');

const authRoutes = require('./modules/auth/auth.routes');
const walletRoutes = require('./modules/wallet/wallet.routes');
const transferRoutes = require('./modules/transfer/transfer.routes');
const savingsRoutes = require('./modules/savings/savings.routes');
const loanRoutes = require('./modules/loan/loan.routes');
const exchangeRoutes = require('./modules/exchange/exchange.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const kycRoutes = require('./modules/kyc/kyc.routes');
const messageRoutes = require('./modules/message/message.routes');

const app = express();

// Render (and most PaaS) terminate TLS at a proxy — trust the first hop
app.set('trust proxy', 1);

// Support comma-separated origins: FRONTEND_URL=https://app.vercel.app,http://localhost:3000
const rawOrigins = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server / curl (no Origin header) and whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/transfer', transferLimiter, transferRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/loan', loanRoutes);
app.use('/api/exchange', exchangeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/messages', messageRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK', system: 'Crypto Bank API', version: '1.0.0' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Crypto Bank API running on port ${PORT}`));

module.exports = app;
