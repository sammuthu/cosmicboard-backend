import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth-minimal';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 7779;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:7777',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://cosmic.board',
    'https://cosmic.board',
    'http://cosmicspace.app',
    'https://cosmicspace.app'
  ],
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'CosmicBoard Backend is running',
    timestamp: new Date().toISOString() 
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CosmicBoard Backend (Minimal) running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth/magic-link`);
});

export default app;