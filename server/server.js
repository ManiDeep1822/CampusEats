require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const socketHandler = require('./socket/socket');
const { startPaymentCleanupJob } = require('./jobs/paymentCleanup');
 
 if (!process.env.JWT_SECRET) {
   console.error('❌ FATAL: JWT_SECRET is missing from environment variables. Server exiting.');
   process.exit(1);
 }

// Routes
const authRoutes = require('./routes/auth.routes');
const studentRoutes = require('./routes/student.routes');
const vendorRoutes = require('./routes/vendor.routes');
const deliveryRoutes = require('./routes/delivery.routes');
const paymentRoutes = require('./routes/payment.routes');
const adminRoutes = require('./routes/admin.routes');
const uploadRoutes = require('./routes/upload.routes');
const botRoutes = require('./routes/bot.routes');
const feedbackRoutes = require('./routes/feedback.routes');
const receiptRoutes = require('./routes/receipt.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();
const server = http.createServer(app);

// Connect Database will happen at the bottom with server.listen
console.log('⏳ Preparing Server...');

console.log('🚀 Loading routes and middleware...');


// CORS Whitelist — always allow Vercel production + local dev, plus any extra CLIENT_URL from env
const allowedOrigins = [
  'https://campus-eats-drab.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
];

// Combine origins and add flexibility
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    
    // Check if origin is in whitelist or is a vercel.app subdomain
     // SECURITY: Restrict to specifically authorized production domains
     const isAllowed = allowedOrigins.includes(origin) || 
                       (process.env.NODE_ENV === 'development' && origin.endsWith('.vercel.app'));
 
     if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked origin: "${origin}"`);
      callback(new Error(`CORS policy blocked origin: ${origin}`));
    }
  },

  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
};


// Middleware
app.use(cors(corsOptions));

app.use(helmet());
 app.use(compression());
 app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
 app.use(express.json({ limit: '10kb' })); // M10: Limit JSON body size
 app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Override req.query getter behavior to prevent mongoSanitize crash
app.use((req, res, next) => {
  if (req.query) {
    const originalQuery = req.query;
    Object.defineProperty(req, 'query', {
      value: { ...originalQuery },
      writable: true,
      enumerable: true,
      configurable: true
    });
  }
  next();
});

// Security Middleware: Prevent NoSQL injections
app.use(mongoSanitize());

// Security Middleware: Prevent XSS cross-site scripting
app.use(xss());

// Security Middleware: Prevent HTTP parameter pollution
app.use(hpp());

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Attach io to app so controllers can use it
app.set('io', io);
socketHandler(io);
startPaymentCleanupJob(io);

// Rate Limiting Config
const apiLimiter = rateLimit({
   windowMs: 15 * 60 * 1000,
   max: 500, // Balanced for production stability
   message: { message: 'Too many requests from this IP, please try again later.' },
   standardHeaders: true,
   legacyHeaders: false,
   skip: (req) => {
     // Only skip explicitly requested health checks or internal calls if absolutely necessary
     const fullPath = req.originalUrl || req.url;
     if (fullPath.startsWith('/api/health')) return true;
     return false; 
   }
 });
 
 const adminLimiter = rateLimit({
   windowMs: 15 * 60 * 1000,
   max: 100, // Stricter limit for admin routes
   message: { message: 'Admin API limit exceeded. Please try again later.' },
   standardHeaders: true,
   legacyHeaders: false
 });

const loginLimiter = rateLimit({
   windowMs: 1 * 60 * 1000,
   max: 5,
   message: { message: 'Too many login attempts, please try again after 60 seconds.' },
   standardHeaders: true,
   legacyHeaders: false
 });
 
 const feedbackLimiter = rateLimit({
   windowMs: 60 * 60 * 1000, // 1 hour
   max: 3, // Only 3 feedbacks per hour per IP
   message: { message: 'Feedback limit reached. Please try again later.' },
   standardHeaders: true,
   legacyHeaders: false
 });

// API Routes
app.use('/api/auth/login', loginLimiter); // Apply strict rate limit specifically to login

// Apply general rate limits to standard user and vendor interfaces
app.use('/api/auth', apiLimiter, authRoutes);
app.use('/api/student', apiLimiter, studentRoutes);
app.use('/api/vendor', apiLimiter, vendorRoutes);
app.use('/api/delivery', apiLimiter, deliveryRoutes);
app.use('/api/payment', apiLimiter, paymentRoutes);
app.use('/api/upload', apiLimiter, uploadRoutes);
app.use('/api/bot', apiLimiter, botRoutes);
app.use('/api/feedback', feedbackLimiter, feedbackRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
 
 // Apply strict rate limits for Admin to prevent brute-force or abuse
 app.use('/api/admin', adminLimiter, adminRoutes);

// Error Handling Middleware
app.use((err, req, res, _) => { // eslint-disable-line no-unused-vars
   const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
   res.status(statusCode);
   
   // H6: Return generic error messages in production
   const message = process.env.NODE_ENV === 'production' && statusCode === 500 
     ? 'An internal server error occurred' 
     : err.message;
 
   res.json({
     message,
     stack: process.env.NODE_ENV === 'production' ? null : err.stack,
   });
 });

// Health check endpoint (used by keep-alive ping below)
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));



const PORT = process.env.PORT || 5000;

// Start Server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);

    // Keep-alive: ping self every 10 mins to prevent Render free tier cold starts
    if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
      const keepAliveUrl = `${process.env.RENDER_EXTERNAL_URL}/api/health`;
      setInterval(() => {
        if (typeof fetch !== 'undefined') {
          fetch(keepAliveUrl)
            .then(() => console.log('[Keep-Alive] Server pinged successfully'))
            .catch(err => console.warn('[Keep-Alive] Ping failed:', err.message));
        }
      }, 10 * 60 * 1000); 
    }
  });
}).catch(err => {
  console.error('❌ Failed to connect to MongoDB. Server will not start:', err.message);
  process.exit(1);
});


// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`🔥 Unhandled Rejection: ${err.message}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`🔥 Uncaught Exception: ${err.message}`);
  process.exit(1);
});


