import { config } from './config';
import { CampaignJobData } from './queue';
import { sendToContactImportQueue } from './sqs';

export type DispatchCampaignDeps = {
    sendToContactImportQueue: (payload: Record<string, unknown>) => Promise<void>;
    fetchImpl: typeof fetch;
    nestjsBaseUrl: string;
    internalSecret: string;
};

export const defaultDispatchCampaignDeps: DispatchCampaignDeps = {
    sendToContactImportQueue,
    fetchImpl: fetch,
    nestjsBaseUrl: config.nestjs.url,
    internalSecret: config.nestjs.internalSecret,
};

export async function dispatchCampaignJob(
    data: CampaignJobData,
    deps: DispatchCampaignDeps = defaultDispatchCampaignDeps,
): Promise<void> {
    if (data.type === 'CSV') {
        await deps.sendToContactImportQueue(data.sqsPayload as unknown as Record<string, unknown>);
        return;
    }

    if (data.type === 'BROADCAST') {
        const base = deps.nestjsBaseUrl.replace(/\/$/, '');
        const url = `${base}/campaign/${data.campaignId}/execute-broadcast`;
        const res = await deps.fetchImpl(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-scheduler-secret': deps.internalSecret,
            },
        });

        if (!res.ok) {
            const body = await res.text();
            throw new Error(`NestJS execute-broadcast failed ${res.status}: ${body}`);
        }
    }
}
