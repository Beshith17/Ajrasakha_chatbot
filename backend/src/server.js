import { createServer } from 'http';
import { app } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { seedKnowledgeIfEmpty } from './data/sampleKnowledge.js';
import { ChatSession } from './models/ChatSession.js';
import { KnowledgeEntry } from './models/KnowledgeEntry.js';
import { ReviewQueueItem } from './models/ReviewQueueItem.js';
import { initializeSocket } from './services/socket.service.js';
async function bootstrap() {
    await connectDatabase();
    await Promise.all([
        KnowledgeEntry.syncIndexes(),
        ChatSession.syncIndexes(),
        ReviewQueueItem.syncIndexes(),
    ]);
    await seedKnowledgeIfEmpty();
    const server = createServer(app);
    initializeSocket(server);
    server.listen(env.port, () => {
        console.log(`Backend server running on port ${env.port}`);
    });
}
bootstrap().catch((error) => {
    console.error('Failed to start backend', error);
    process.exit(1);
});
