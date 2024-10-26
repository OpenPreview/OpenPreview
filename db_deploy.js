const moment = require('moment');
const execSync = require('child_process').execSync;

const dateTime = moment().format('YYYYMMDDHHmmss');

execSync(
  `bunx supabase db diff --local > supabase/migrations/${dateTime}_migration.sql`,
  { stdio: [0, 1, 2] },
);
