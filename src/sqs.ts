import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { config } from './config';

const sqsClient = new SQSClient({ region: config.aws.region });

export async function sendToContactImportQueue(payload: Record<string, unknown>): Promise<void> {
    if (!config.aws.contactImportQueueUrl) {
        throw new Error('CONTACT_IMPORT_QUEUE_URL is not configured');
    }
    await sqsClient.send(new SendMessageCommand({
        QueueUrl: config.aws.contactImportQueueUrl,
        MessageBody: JSON.stringify(payload),
    }));
}
