import { queueEmail as coreQueueEmail } from './emailQueue.js';
import { triggerQueueProcessing } from './email.worker.js';

/**
 * Enqueues a notification email inside the database logs after checking validation,
 * rate limiting, and user preference opt-outs. Exposes a backward-compatible wrapper.
 */
export async function queueEmail(
  supabaseClient: any,
  userId: string | null,
  recipient: string,
  templateName: string,
  subject: string,
  payload: any
): Promise<boolean> {
  const result = await coreQueueEmail(supabaseClient, userId, recipient, templateName, subject, payload);
  if (result) {
    // Notify the worker to check for updates immediately
    triggerQueueProcessing();
  }
  return result;
}
