import 'dotenv/config';
import express from 'express';
import { config } from './config';
import { CAMPAIGN_QUEUE_NAME, campaignQueue } from './queue';
import { router } from './routes';
import { startWorker } from './worker';

const app = express();
app.use(express.json());
app.use('/api', router);

const worker = startWorker();

const server = app.listen(config.port, () => {
    console.log(`[scheduler] Listening on port ${config.port}`);
    void campaignQueue
        .getJobCounts()
        .then((counts) => {
            console.log(`[scheduler] Queue "${CAMPAIGN_QUEUE_NAME}" counts:`, counts);
            const n = (counts.delayed ?? 0) + (counts.waiting ?? 0) + (counts.active ?? 0);
            if (n === 0) {
                console.log(
                    '[scheduler] No waiting/delayed/active jobs. Schedule from Nest after fixing SCHEDULER_SECRET, or inspect past failures: counts.failed',
                );
            }
        })
        .catch((err: Error) => {
            console.error('[scheduler] Cannot reach Redis / read queue:', err.message);
            console.error('[scheduler] Fix REDIS_URL in .env — worker will not process jobs without Redis.');
        });
});

async function shutdown() {
    console.log('[scheduler] Shutting down...');
    await worker.close();
    server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
