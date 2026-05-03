export const config = {
    port: parseInt(process.env.PORT || '3010', 10),
    schedulerSecret: process.env.SCHEDULER_SECRET || 'dev-secret',
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    aws: {
        region: process.env.AWS_REGION || 'ap-south-1',
        contactImportQueueUrl: process.env.CONTACT_IMPORT_QUEUE_URL || '',
    },
    nestjs: {
        /** Must include Nest global prefix (default Nest PORT=3000, prefix api/v1). */
        url: process.env.NESTJS_URL || 'http://localhost:3000/api/v1',
        /** Must match bbai-nestjs SCHEDULER_SECRET on execute-broadcast */
        internalSecret:
            process.env.SCHEDULER_SECRET ||
            process.env.NESTJS_INTERNAL_SECRET ||
            'dev-secret',
    },
};
