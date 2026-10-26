import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const require = createRequire(import.meta.url);

// Override the URL only for the migration subprocess. The app and Next build
// retain DATABASE_URL's pooled connection.
export function migrationEnvironment(environment) {
  const env = { ...environment };
  const connection = env.DIRECT_URL || env.DATABASE_URL;
  if (!connection) return env; // Prisma can still load a local .env file.
  let url;
  try {
    url = new URL(connection);
  } catch {
    throw new Error('The migration database connection URL is invalid.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('The migration database connection must use PostgreSQL.');
  }
  if (url.hostname.endsWith('.neon.tech')) {
    url.hostname = url.hostname.replace(/-pooler(?=\.)/, '');
    url.searchParams.delete('pgbouncer');
    env.DATABASE_URL = url.toString();
  } else if (env.DIRECT_URL) {
    env.DATABASE_URL = connection;
  }
  return env;
}

export function advisoryLockTimeout(output) {
  return /P1002/.test(output) && /(?:advisory lock|pg_advisory_lock)/i.test(output);
}

export async function migrateDeploy({
  environment = process.env,
  run = env => spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
    env, encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'], maxBuffer: 10 * 1024 * 1024,
  }),
  wait = delay,
  log = text => process.stdout.write(text),
} = {}) {
  const env = migrationEnvironment(environment);
  for (let attempt = 1; attempt <= 4; attempt++) {
    const result = run(env);
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    log(output);
    if (result.status === 0 && !result.error) return 0;
    if (result.error || result.signal || !advisoryLockTimeout(output) || attempt === 4) {
      if (result.error || result.signal) log('Migration process could not complete. The build has been stopped.\n');
      if (advisoryLockTimeout(output)) log('Migration lock is still held. Allow the other migration to finish before redeploying.\n');
      return result.status || 1;
    }
    log(`Another migration holds the database lock. Retrying in 10 seconds (${attempt}/3).\n`);
    await wait(10_000);
  }
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await migrateDeploy();
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Migration failed.');
    process.exitCode = 1;
  }
}
