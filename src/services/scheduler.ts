import { Queue } from 'bullmq';

export async function initQueues() {
  // Initialize job queues
  const scrapingQueue = new Queue('scraping', {
    connection: {
      host: 'localhost',
      port: 6379
    }
  });

  console.log('Job queues initialized');
}
