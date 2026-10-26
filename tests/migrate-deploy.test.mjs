import test from 'node:test';
import assert from 'node:assert/strict';
import { migrationEnvironment, advisoryLockTimeout, migrateDeploy } from '../scripts/migrate-deploy.mjs';

const pooled = 'postgresql://user:p%40ss@ep-example-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true';
const lockError = { status: 1, stderr: 'Error: P1002 Timed out trying to acquire a postgres advisory lock (SELECT pg_advisory_lock(72707369)).' };

test('Neon migration uses the same database directly without changing app environment', () => {
  const original = { DATABASE_URL: pooled, OTHER: 'kept' };
  const env = migrationEnvironment(original);
  const url = new URL(env.DATABASE_URL);
  assert.equal(url.hostname, 'ep-example.c-2.us-east-2.aws.neon.tech');
  assert.equal(url.password, 'p%40ss');
  assert.equal(url.pathname, '/neondb');
  assert.equal(url.searchParams.get('sslmode'), 'require');
  assert.equal(url.searchParams.has('pgbouncer'), false);
  assert.equal(env.OTHER, 'kept');
  assert.equal(original.DATABASE_URL, pooled);
});
test('explicit DIRECT_URL is respected and unrelated hostnames are not rewritten', () => {
  const direct = 'postgresql://user:password@db.example.test/db?sslmode=require';
  assert.equal(migrationEnvironment({ DATABASE_URL: pooled, DIRECT_URL: direct }).DATABASE_URL, direct);
  assert.equal(migrationEnvironment({ DATABASE_URL: direct }).DATABASE_URL, direct);
  assert.equal(migrationEnvironment({ DATABASE_URL: 'postgresql://user:pass@ep-pooler.neon.tech.example.test/db' }).DATABASE_URL, 'postgresql://user:pass@ep-pooler.neon.tech.example.test/db');
  assert.deepEqual(migrationEnvironment({}), {});
  assert.throws(() => migrationEnvironment({ DATABASE_URL: 'bad-secret' }), error => !error.message.includes('bad-secret'));
});
test('lock failures retry, then a successful migration allows the build to continue', async () => {
  let calls = 0; const waits = [];
  const code = await migrateDeploy({ environment: { DATABASE_URL: pooled }, run: env => {
    assert.ok(!new URL(env.DATABASE_URL).hostname.includes('-pooler'));
    return ++calls === 3 ? { status: 0, stdout: 'No pending migrations.' } : lockError;
  }, wait: async ms => waits.push(ms), log() {} });
  assert.equal(code, 0); assert.equal(calls, 3); assert.deepEqual(waits, [10000, 10000]);
});
test('persistent locks are bounded and real migration failures are never swallowed', async () => {
  let calls = 0;
  assert.equal(await migrateDeploy({ environment: {}, run: () => { calls++; return lockError; }, wait: async () => {}, log() {} }), 1);
  assert.equal(calls, 4);
  for (const result of [{ status: 1, stderr: 'P3018 Migration failed' }, { status: 1, stderr: 'P1002 Connection timeout' }, { status: null, error: new Error('failed') }]) {
    calls = 0;
    assert.equal(await migrateDeploy({ environment: {}, run: () => { calls++; return result; }, wait: async () => assert.fail('must not retry'), log() {} }), 1);
    assert.equal(calls, 1);
  }
  assert.equal(advisoryLockTimeout('pg_advisory_lock no timeout code'), false);
});
