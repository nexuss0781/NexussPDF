import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Vercel function stays within the Hobby plan memory limit', async () => {
  const config = JSON.parse(await readFile('vercel.json', 'utf8'));
  const functionConfig = config.functions['api/extract.js'];

  assert.equal(functionConfig.runtime, 'nodejs22.x');
  assert.ok(functionConfig.memory <= 2048, 'memory must not exceed the Hobby plan limit');
});
