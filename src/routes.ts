import { Router, Request, Response } from 'express';
import { campaignQueue } from './queue';
import { CampaignJobData } from './queue';
import { config } from './config';

export const router = Router();

function requireSecret(req: Request, res: Response, next: () => void) {
    if (req.headers['x-scheduler-secret'] !== config.schedulerSecret) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    next();
}

// POST /api/schedule — enqueue a campaign job (immediate or delayed)
router.post('/schedule', requireSecret, async (req: Request, res: Response) => {
    const { jobData, scheduledAt }: { jobData: CampaignJobData; scheduledAt?: string } = req.body;

    if (!jobData?.type || !jobData?.campaignId) {
        res.status(400).json({ error: 'jobData.type and jobData.campaignId are required' });
        return;
    }

    let delay = 0;
    if (scheduledAt) {
        const ms = new Date(scheduledAt).getTime() - Date.now();
        if (ms > 0) delay = ms;
    }

    const job = await campaignQueue.add(
        `${jobData.type.toLowerCase()}-${jobData.campaignId}`,
        jobData,
        { delay },
    );

    res.json({ jobId: job.id, delay, enqueued: true });
});

// DELETE /api/jobs/:jobId — cancel (remove) a pending job
router.delete('/jobs/:jobId', requireSecret, async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const job = await campaignQueue.getJob(jobId);

    if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
    }

    const state = await job.getState();
    if (state === 'active') {
        res.status(409).json({ error: 'Cannot cancel an active job' });
        return;
    }

    await job.remove();
    res.json({ jobId, removed: true });
});

// GET /api/jobs — list waiting/delayed jobs
router.get('/jobs', requireSecret, async (_req: Request, res: Response) => {
    const [waiting, delayed] = await Promise.all([
        campaignQueue.getWaiting(0, 100),
        campaignQueue.getDelayed(0, 100),
    ]);

    const format = (jobs: Awaited<ReturnType<typeof campaignQueue.getWaiting>>) =>
        jobs.map((j) => ({
            jobId: j.id,
            name: j.name,
            type: j.data.type,
            campaignId: j.data.campaignId,
            delay: j.opts.delay ?? 0,
            timestamp: j.timestamp,
        }));

    res.json({ waiting: format(waiting), delayed: format(delayed) });
});

// GET /api/health
router.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
});
