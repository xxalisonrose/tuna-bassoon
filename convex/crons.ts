import { cronJobs } from 'convex/server';

import { internal } from './_generated/api';

const crons = cronJobs();

crons.daily(
  'maintain annual badge editions',
  { hourUTC: 9 },
  internal.annualBadgeEditions.maintainAnnualBadgeEditions,
  {},
);

export default crons;
