import express from 'express';
import { config } from './config';
import { router } from './routes';
import { startWorker } from './worker';

const app = express();
app.use(express.json());
app.use('/api', router);

const worker = startWorker();

const server = app.listen(config.port, () => {
    console.log(`[scheduler] Listening on port ${config.port}`);
});

async function shutdown() {
    console.log('[scheduler] Shutting down...');
    await worker.close();
    server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
