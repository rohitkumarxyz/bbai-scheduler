import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { config } from './config';
import { CAMPAIGN_QUEUE_NAME, CampaignJobData } from './queue';
import { sendToContactImportQueue } from './sqs';

const workerRedis = new IORedis(config.redis.url, { maxRetriesPerRequest: null });

async function executeJob(job: Job<CampaignJobData>): Promise<void> {
    const { data } = job;
    console.log(`[worker] Processing job ${job.id} type=${data.type} campaignId=${data.campaignId}`);

    if (data.type === 'CSV') {
        // Push the CSV import payload to SQS — Lambda pipeline takes it from here
        await sendToContactImportQueue(data.sqsPayload as unknown as Record<string, unknown>);
        console.log(`[worker] CSV campaign ${data.campaignId} → SQS ContactImportQueue`);
        return;
    }

    if (data.type === 'BROADCAST') {
        // Call NestJS internal endpoint to execute the broadcast
        const url = `${config.nestjs.url}/campaign/${data.campaignId}/execute-broadcast`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-scheduler-secret': config.nestjs.internalSecret,
            },
        });

        if (!res.ok) {
            const body = await res.text();
            throw new Error(`NestJS execute-broadcast failed ${res.status}: ${body}`);
        }
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

    return worker;
}
