import { describe, it, expect, vi } from 'vitest';
import { dispatchCampaignJob, type DispatchCampaignDeps } from './dispatch-campaign-job';
import type { CampaignJobData } from './queue';

function deps(over: Partial<DispatchCampaignDeps>): DispatchCampaignDeps {
    return {
        sendToContactImportQueue: vi.fn().mockResolvedValue(undefined),
        fetchImpl: vi.fn(),
        nestjsBaseUrl: 'http://nest.test/api/v1',
        internalSecret: 'internal-secret',
        ...over,
    };
}

describe('dispatchCampaignJob', () => {
    it('CSV forwards sqsPayload to sendToContactImportQueue', async () => {
        const sendToContactImportQueue = vi.fn().mockResolvedValue(undefined);
        const data: CampaignJobData = {
            type: 'CSV',
            campaignId: 'camp-1',
            sqsPayload: {
                importId: 'imp-1',
                organisationId: 'org-1',
                projectId: 'proj-1',
                s3Key: 'k.csv',
                mapping: { Phone: 'userPhone' },
                campaignPayload: {
                    campaignId: 'camp-1',
                    templateId: 'tpl-1',
                    parameterMappings: [],
                    mediaLink: 'https://x.example/m.jpg',
                },
            },
        };

        await dispatchCampaignJob(data, deps({ sendToContactImportQueue }));

        expect(sendToContactImportQueue).toHaveBeenCalledTimes(1);
        expect(sendToContactImportQueue.mock.calls[0][0]).toEqual({
            importId: 'imp-1',
            organisationId: 'org-1',
            projectId: 'proj-1',
            s3Key: 'k.csv',
            mapping: { Phone: 'userPhone' },
            campaignPayload: {
                campaignId: 'camp-1',
                templateId: 'tpl-1',
                parameterMappings: [],
                mediaLink: 'https://x.example/m.jpg',
            },
        });
    });

    it('BROADCAST POSTs execute-broadcast with secret header', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => '',
        });

        const data: CampaignJobData = {
            type: 'BROADCAST',
            campaignId: 'camp-b',
            organisationId: 'org-b',
        };

        await dispatchCampaignJob(data, deps({ fetchImpl }));

        expect(fetchImpl).toHaveBeenCalledWith(
            'http://nest.test/api/v1/campaign/camp-b/execute-broadcast',
            expect.objectContaining({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-scheduler-secret': 'internal-secret',
                },
            }),
        );
    });

    it('BROADCAST throws when Nest returns non-OK', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            text: async () => 'boom',
        });

        const data: CampaignJobData = {
            type: 'BROADCAST',
            campaignId: 'camp-x',
            organisationId: 'org-x',
        };

        await expect(dispatchCampaignJob(data, deps({ fetchImpl }))).rejects.toThrow(
            'NestJS execute-broadcast failed 500: boom',
        );
    });
});
