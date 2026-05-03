import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { config } from './config';
import { CAMPAIGN_QUEUE_NAME, CampaignJobData } from './queue';
import { defaultDispatchCampaignDeps, dispatchCampaignJob } from './dispatch-campaign-job';

const workerRedis = new IORedis(config.redis.url, { maxRetriesPerRequest: null });

async function executeJob(job: Job<CampaignJobData>): Promise<void> {
    const { data } = job;
    console.log(`[worker] Processing job ${job.id} type=${data.type} campaignId=${data.campaignId}`);

    await dispatchCampaignJob(data, defaultDispatchCampaignDeps);

    if (data.type === 'CSV') {
        console.log(`[worker] CSV campaign ${data.campaignId} → SQS ContactImportQueue`);
        return;
    }

    if (data.type === 'BROADCAST') {
        console.log(`[worker] Broadcast campaign ${data.campaignId} → NestJS execute-broadcast OK`);
    }
}

export function startWorker(): Worker<CampaignJobData> {
    const worker = new Worker<CampaignJobData>(
        CAMPAIGN_QUEUE_NAME,
        executeJob,
        {
            connection: workerRedis,
            concurrency: 5,
        }
    );

    worker.on('completed', (job) => {
        console.log(`[worker] Job ${job.id} completed (${job.data.type} campaignId=${job.data.campaignId})`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[worker] Job ${job?.id} failed: ${err.message}`);
    });

    worker.on('error', (err) => {
        console.error('[worker] Worker error:', err.message);
    });

    worker.once('ready', () => {
        console.log(
            `[worker] Ready — consuming "${CAMPAIGN_QUEUE_NAME}" (same Redis as SCHEDULER /api/schedule)`,
        );
    });

    return worker;
}
