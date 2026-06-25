import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { triggerNotificationEvent } from './notificationService.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                           process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                           process.env.SERVICE_ROLE_KEY || 
                           supabaseAnonKey;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BATCH_SIZE = 20;
const POLL_INTERVAL = 5000; // 5 seconds

let isProcessing = false;
let timeoutId: NodeJS.Timeout | null = null;

/**
 * Process a batch of pending notification events
 */
export async function processNotificationEvents(): Promise<boolean> {
  if (isProcessing) return false;
  isProcessing = true;

  let hasMore = false;

  try {
    // 1. Fetch and lock pending events
    const { data: batch, error: fetchError } = await supabase.rpc('fetch_and_lock_notification_events', {
      p_limit: BATCH_SIZE,
    });

    if (fetchError) {
      // If the function is not yet in the database, log a warning and return
      if (fetchError.message?.includes('does not exist')) {
        console.warn('[Notification Worker] Warning: public.fetch_and_lock_notification_events function not found in database. Make sure you queried the migration file.');
      } else {
        console.error('[Notification Worker] Error fetching pending events:', fetchError.message || fetchError);
      }
      isProcessing = false;
      return false;
    }

    if (!batch || batch.length === 0) {
      isProcessing = false;
      return false;
    }

    console.log(`[Notification Worker] Processing locked batch of ${batch.length} events...`);
    hasMore = batch.length === BATCH_SIZE;

    // 2. Process each event in the batch
    for (const event of batch) {
      const { id, event_type, actor_id, payload } = event;

      try {
        console.log(`[Notification Worker] Handling event ID: ${id} ("${event_type}")...`);
        
        // Dispatch notifications & queue emails
        const success = await triggerNotificationEvent(event_type, actor_id, payload || {});

        if (success) {
          // Success: update status to 'completed'
          const { error: updateError } = await supabase.rpc('update_notification_event_status', {
            p_id: id,
            p_status: 'completed',
            p_error_message: null,
          });

          if (updateError) {
            console.error(`[Notification Worker] Failed to update completed status for event ${id}:`, updateError.message);
          } else {
            console.log(`[Notification Worker] Event ${id} completed successfully.`);
          }
        } else {
          throw new Error('Notification service failed to dispatch event');
        }
      } catch (error: any) {
        const errorMsg = error.message || error || 'Unknown event processing failure';
        console.error(`[Notification Worker] Failed to process event ${id}:`, errorMsg);

        // Update status to 'failed'
        const { error: updateError } = await supabase.rpc('update_notification_event_status', {
          p_id: id,
          p_status: 'failed',
          p_error_message: errorMsg,
        });

        if (updateError) {
          console.error(`[Notification Worker] Failed to update failed status for event ${id}:`, updateError.message);
        }
      }
    }
  } catch (error) {
    console.error('[Notification Worker] Unhandled exception in processNotificationEvents:', error);
  } finally {
    isProcessing = false;
  }

  return hasMore;
}

/**
 * Polling loop that schedules itself dynamically.
 */
async function pollLoop(): Promise<void> {
  const hasMore = await processNotificationEvents();
  
  // If there were more items in the queue, run again immediately, otherwise wait POLL_INTERVAL
  const delay = hasMore ? 100 : POLL_INTERVAL;
  timeoutId = setTimeout(() => {
    pollLoop().catch((err) => console.error('[Notification Worker] Poll loop exception:', err));
  }, delay);
}

/**
 * Starts background polling for notification events.
 */
export function startNotificationWorker(): void {
  console.log('🚀 Starting background notification worker (runs every 5s)...');
  
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  
  pollLoop().catch((err) => console.error('[Notification Worker] Initial loop startup error:', err));
}
