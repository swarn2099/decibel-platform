import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './routes/health';

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

// Public routes
app.use('/health', healthRouter);

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Decibel API running on port ${PORT}`);
});
