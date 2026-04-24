import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { config } from './config';

export const redis = new IORedis(config.redis.url, {
    maxRetriesPerRequest: null, // required by BullMQ
});

export const CAMPAIGN_QUEUE_NAME = 'bbai:campaigns';

export const campaignQueue = new Queue(CAMPAIGN_QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 200 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
    },
});

export interface CsvJobData {
    type: 'CSV';
    campaignId: string;
    sqsPayload: {
        importId: string;
        organisationId: string;
        projectId: string;
        s3Key: string;
        mapping: Record<string, string>;
        campaignPayload: {
            campaignId: string;
            templateId: string;
            parameterMappings: any[];
        };
    };
}

export interface BroadcastJobData {
    type: 'BROADCAST';
    campaignId: string;
    organisationId: string;
}

export type CampaignJobData = CsvJobData | BroadcastJobData;
