import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import chatRoutes from './routes/chat.routes.js';
import metaRoutes from './routes/meta.routes.js';
import speechRoutes from './routes/speech.routes.js';
export const app = express();
app.use(cors({
    origin: env.clientUrl,
}));
app.use(express.json());
app.use(morgan('dev', {
    skip: (req) => req.path.startsWith('/socket.io/'),
}));
app.use('/api', metaRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/speech', speechRoutes);
