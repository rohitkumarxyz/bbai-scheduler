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
        url: process.env.NESTJS_URL || 'http://localhost:8080/api/v1',
        internalSecret: process.env.NESTJS_INTERNAL_SECRET || 'dev-internal-secret',
    },
};
