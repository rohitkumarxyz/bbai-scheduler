import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Server } from 'http';

// Mock queue before importing routes so BullMQ/Redis never connect
vi.mock('./queue', () => ({
    campaignQueue: {
        add: vi.fn().mockResolvedValue({ id: 'job-1' }),
        getJob: vi.fn(),
        getWaiting: vi.fn().mockResolvedValue([]),
        getDelayed: vi.fn().mockResolvedValue([]),
    },
}));

const SECRET = 'test-secret-e2e';

describe('routes auth (e2e)', () => {
    let server: Server;
    let app: express.Express;

    beforeAll(async () => {
        // Set env BEFORE config module is evaluated
        process.env.SCHEDULER_SECRET = SECRET;

        // Dynamic import so config reads the env we just set
        const { router } = await import('./routes');
        app = express();
        app.use(express.json());
        app.use('/api', router);
        server = app.listen(0);
    });

    afterAll(() => {
        server.close();
        delete process.env.SCHEDULER_SECRET;
    });

    it('POST /api/schedule without secret returns 401', async () => {
        const res = await request(app)
            .post('/api/schedule')
            .send({ jobData: { type: 'BROADCAST', campaignId: 'c1', organisationId: 'o1' } });
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: 'Unauthorized' });
    });

    it('POST /api/schedule with wrong secret returns 401', async () => {
        const res = await request(app)
            .post('/api/schedule')
            .set('x-scheduler-secret', 'wrong-secret')
            .send({ jobData: { type: 'BROADCAST', campaignId: 'c1', organisationId: 'o1' } });
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: 'Unauthorized' });
    });

    it('POST /api/schedule with correct secret enqueues and returns jobId', async () => {
        const res = await request(app)
            .post('/api/schedule')
            .set('x-scheduler-secret', SECRET)
            .send({ jobData: { type: 'BROADCAST', campaignId: 'c1', organisationId: 'o1' } });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ jobId: 'job-1', enqueued: true });
    });

    it('GET /api/health is public (no secret needed)', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
    });

    it('GET /api/jobs requires secret', async () => {
        const res = await request(app).get('/api/jobs');
        expect(res.status).toBe(401);
    });
});
