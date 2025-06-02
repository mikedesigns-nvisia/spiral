import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { initializeDatabase } from './database/connection.js';
import { authenticateUser, optionalAuth } from './middleware/auth.js';
import entriesRouter from './routes/entries.js';
import constellationsRouter from './routes/constellations.js';
import glyphsRouter from './routes/glyphs.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3002;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, file://, etc.)
    if (!origin) return callback(null, true);
    
    // Allow file:// protocol for local demo HTML files
    if (origin === 'null' || origin.startsWith('file://')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const { checkDatabaseHealth } = await import('./database/connection.js');
    const dbHealthy = await checkDatabaseHealth();
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        ai: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
        websocket: 'healthy'
      }
    };

    const statusCode = dbHealthy ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API routes
app.use('/api/entries', entriesRouter);
app.use('/api/constellations', constellationsRouter);
app.use('/api/glyphs', glyphsRouter);

// Root endpoint with API information
app.get('/', (req, res) => {
  res.json({
    name: 'The Reflector Codex API',
    version: '1.0.0',
    description: 'Backend infrastructure for recursive journaling with Laani symbolic architecture',
    endpoints: {
      health: '/health',
      entries: '/api/entries',
      constellations: '/api/constellations',
      glyphs: '/api/glyphs',
      websocket: `ws://localhost:${WS_PORT}`
    },
    documentation: 'https://github.com/reflector-codex/api-docs',
    status: 'operational'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.method} ${req.path} does not exist`,
    available_endpoints: [
      'GET /',
      'GET /health',
      'GET /api/entries',
      'POST /api/entries',
      'GET /api/entries/:id',
      'PUT /api/entries/:id',
      'DELETE /api/entries/:id',
      'GET /api/entries/resurface',
      'POST /api/entries/:id/reflect',
      'GET /api/constellations',
      'GET /api/constellations/themes',
      'GET /api/glyphs',
      'POST /api/glyphs/evolve',
      'POST /api/glyphs/suggest'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.message,
      details: error.errors
    });
  }
  
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Invalid or expired token'
    });
  }
  
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed'
    });
  }

  // Default error response
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// WebSocket server for real-time reflection updates
const wss = new WebSocketServer({ port: WS_PORT });

// Store active connections
const activeConnections = new Map();

wss.on('connection', (ws, req) => {
  const connectionId = Math.random().toString(36).substring(7);
  console.log(`🔌 WebSocket connected: ${connectionId}`);
  
  // Store connection
  activeConnections.set(connectionId, {
    ws,
    userId: null,
    connectedAt: new Date(),
    lastPing: new Date()
  });

  // Handle authentication
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'auth') {
        try {
          const { getUserFromToken } = await import('./database/connection.js');
          const user = await getUserFromToken(data.token);
          
          // Update connection with user info
          const connection = activeConnections.get(connectionId);
          if (connection) {
            connection.userId = user.id;
            activeConnections.set(connectionId, connection);
            
            ws.send(JSON.stringify({
              type: 'auth_success',
              userId: user.id,
              message: 'Authenticated successfully'
            }));
            
            console.log(`🔐 WebSocket authenticated for user: ${user.id}`);
          }
        } catch (authError) {
          ws.send(JSON.stringify({
            type: 'auth_error',
            message: 'Authentication failed'
          }));
          console.error('WebSocket auth error:', authError);
        }
      } else if (data.type === 'ping') {
        const connection = activeConnections.get(connectionId);
        if (connection) {
          connection.lastPing = new Date();
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  ws.on('close', () => {
    console.log(`🔌 WebSocket disconnected: ${connectionId}`);
    activeConnections.delete(connectionId);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    activeConnections.delete(connectionId);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    connectionId,
    message: 'Connected to The Reflector Codex'
  }));
});

// Function to broadcast to user's connections
export function broadcastToUser(userId, message) {
  const userConnections = Array.from(activeConnections.values())
    .filter(conn => conn.userId === userId);
  
  userConnections.forEach(({ ws }) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  
  // Close WebSocket connections
  activeConnections.forEach(({ ws }) => {
    ws.close();
  });
  
  // Close HTTP server
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  
  // Close WebSocket connections
  activeConnections.forEach(({ ws }) => {
    ws.close();
  });
  
  // Close HTTP server
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start server
async function startServer() {
  try {
    console.log('🌀 Starting The Reflector Codex API...');
    
    // Initialize database connection
    await initializeDatabase();
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`🚀 HTTP Server running on port ${PORT}`);
      console.log(`🔌 WebSocket server running on port ${WS_PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 CORS enabled for: ${allowedOrigins.join(', ')}`);
    });

    // Export server for graceful shutdown
    global.server = server;

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default app;
