import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './routes/health';
import { itemsRouter } from './routes/items';
import { usersRouter } from './routes/users';
import { feedRouter } from './routes/feed';
import { foundersRouter } from './routes/founders';
import { collectionsRouter } from './routes/collections';
import { leaderboardRouter } from './routes/leaderboard';
import { metricsRouter } from './routes/metrics';
import { notificationsRouter } from './routes/notifications';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

// Public routes
app.use('/health', healthRouter);

// Protected routes (require valid Supabase JWT)
app.use('/api/items', authMiddleware, itemsRouter);
app.use('/api/users', authMiddleware, usersRouter);
app.use('/api/feed', authMiddleware, feedRouter);
app.use('/api/founders', authMiddleware, foundersRouter);
app.use('/api/collections', authMiddleware, collectionsRouter);
app.use('/api/leaderboard', authMiddleware, leaderboardRouter);
app.use('/api/metrics', authMiddleware, metricsRouter);
app.use('/api/notifications', authMiddleware, notificationsRouter);

app.use(errorHandler);

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Decibel API running on port ${PORT}`);
});
