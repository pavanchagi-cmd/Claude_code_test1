import { error, json } from '@/lib/api';
import { isCronAuthorized } from '@/lib/cron';
import { processJobs } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return error('Unauthorized', 401);
  return json(await processJobs());
}
