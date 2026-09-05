'use client';

import { useEffect } from 'react';

import { heartbeatAction } from '@/app/actions/activity';

const HEARTBEAT_MS = 60_000;

/**
 * Fires after the first paint and then every minute while the tab is visible,
 * stamping the current user's last_seen_at so admins can see online status.
 */
export function ActivityHeartbeat() {
  useEffect(() => {
    let disposed = false;
    const ping = () => {
      if (disposed || document.visibilityState !== 'visible') return;
      void heartbeatAction().catch(() => {});
    };
    ping();
    const id = window.setInterval(ping, HEARTBEAT_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') ping();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return null;
}