import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import type { Request } from 'express';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                           process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                           process.env.SERVICE_ROLE_KEY || 
                           process.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface AuditEventParams {
  userId: string | null;
  familyId?: string | null;
  workspaceId?: string | null;
  entityType: string;
  entityId: string | null;
  eventType: string;
  oldValue?: any;
  newValue?: any;
  req?: Request;
}

export async function logAuditEvent({
  userId,
  familyId = null,
  workspaceId = null,
  entityType,
  entityId,
  eventType,
  oldValue = null,
  newValue = null,
  req,
}: AuditEventParams) {
  let ipAddress: string | null = null;
  let userAgent: string | null = null;

  if (req) {
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    ipAddress = Array.isArray(rawIp) ? rawIp[0] : (rawIp as string || null);
    userAgent = req.headers['user-agent'] || null;
  }

  try {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      family_id: familyId,
      workspace_id: workspaceId,
      entity_type: entityType,
      entity_id: entityId,
      event_type: eventType,
      old_value: oldValue,
      new_value: newValue,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
    if (error) {
      console.error('Error inserting audit log:', error);
    }
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}
