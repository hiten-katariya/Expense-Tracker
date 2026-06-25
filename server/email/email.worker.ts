import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { resend } from './resend.js';
import { renderEmailTemplate } from './templateRenderer.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                           process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                           process.env.SERVICE_ROLE_KEY || 
                           supabaseAnonKey;

if (supabaseServiceKey === supabaseAnonKey) {
  console.warn('⚠️ Warning: SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables. The email queue worker will run with the anonymous client key, which may fail if the database RPC execute permissions are restricted.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@expenso.dev';
const MAX_RETRIES = 3;
const BATCH_SIZE = 20;
const POLL_INTERVAL = 10000; // 10 seconds

let isProcessing = false;
let timeoutId: NodeJS.Timeout | null = null;

/**
 * Process a batch of queued emails (up to 20 at a time)
 */
export async function processQueue(): Promise<boolean> {
  if (isProcessing) return false;
  isProcessing = true;

  let hasMore = false;

  try {
    console.log('[Email Worker] Checking queue for pending emails...');
    
    // 1. Fetch and lock queued emails using security definer RPC
    const { data: batch, error: fetchError } = await supabase.rpc('fetch_and_lock_queued_emails', {
      p_limit: BATCH_SIZE,
    });

    if (fetchError) {
      console.error('[Email Worker] Error fetching locked emails from queue:', fetchError.message || fetchError);
      isProcessing = false;
      return false;
    }

    if (!batch || batch.length === 0) {
      isProcessing = false;
      return false;
    }

    console.log(`[Email Worker] Processing locked batch of ${batch.length} emails...`);
    hasMore = batch.length === BATCH_SIZE;

    // 2. Process each email in the locked batch
    for (const log of batch) {
      const { id, user_id, recipient, template_name, subject, payload, retry_count } = log;

      try {
        console.log(`[Email Worker] Rendering template "${template_name}" for ${recipient}...`);
        
        // Render template
        const template = renderEmailTemplate(template_name, payload || {});

        console.log(`[Email Worker] Dispatching email "${template_name}" to ${recipient} (Attempt ${retry_count + 1}/${MAX_RETRIES})...`);

        // Send email via Resend
        const response = await resend.emails.send({
          from: FROM_EMAIL,
          to: recipient,
          subject: template.subject || subject || 'Notification',
          html: template.html,
        });

        if (response.error) {
          throw new Error(response.error.message || 'Resend response error');
        }

        // Success: update DB status to 'sent'
        const { error: updateError } = await supabase.rpc('update_email_log_status', {
          p_id: id,
          p_status: 'sent',
          p_retry_count: retry_count,
          p_error_message: null,
          p_resend_id: response.data?.id || null,
        });

        if (updateError) {
          console.error(`[Email Worker] Failed to update success status for log ID ${id}:`, updateError.message);
        } else {
          console.log(`[Email Worker] Email sent successfully! Log ID: ${id}, Resend ID: ${response.data?.id}`);
        }
      } catch (error: any) {
        const errorMsg = error.message || error || 'Unknown delivery failure';
        console.error(`[Email Worker] Failed to send email ID ${id}:`, errorMsg);

        const nextRetryCount = retry_count + 1;
        const newStatus = nextRetryCount >= MAX_RETRIES ? 'failed' : 'queued';

        // Update DB status: queue again or fail permanently
        const { error: updateError } = await supabase.rpc('update_email_log_status', {
          p_id: id,
          p_status: newStatus,
          p_retry_count: nextRetryCount,
          p_error_message: errorMsg,
          p_resend_id: null,
        });

        if (updateError) {
          console.error(`[Email Worker] Failed to update failure status for log ID ${id}:`, updateError.message);
        }
      }
    }
  } catch (error) {
    console.error('[Email Worker] Unhandled exception in processQueue:', error);
  } finally {
    isProcessing = false;
  }

  return hasMore;
}

/**
 * Polling loop that schedules itself dynamically.
 */
async function pollLoop(): Promise<void> {
  const hasMore = await processQueue();
  
  // If there were more items in the queue, run again immediately, otherwise wait POLL_INTERVAL
  const delay = hasMore ? 100 : POLL_INTERVAL;
  timeoutId = setTimeout(() => {
    pollLoop().catch((err) => console.error('[Email Worker] Poll loop exception:', err));
  }, delay);
}

/**
 * Starts background polling for the queue worker.
 */
export function startEmailQueueWorker(): void {
  console.log('🚀 Starting background email worker (runs every 10s)...');
  
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  
  pollLoop().catch((err) => console.error('[Email Worker] Initial loop startup error:', err));
}

/**
 * Triggers queue processing immediately.
 */
export function triggerQueueProcessing(): void {
  processQueue().catch((err) => console.error('[Email Worker] Direct trigger execution error:', err));
}
