'use server';

import { requireUser } from '@/lib/server/dal';
import { getRepository } from '@/lib/server/runtime';

/** Online presence heartbeat — stamps the current user's last_seen_at. */
export async function heartbeatAction(): Promise<void> {
  const current = await requireUser();
  const repo = await getRepository();
  await repo.touchLastActivity(current.user.id);
}