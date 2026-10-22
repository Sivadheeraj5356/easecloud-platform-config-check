const test = require('node:test');
const assert = require('node:assert/strict');
const { check } = require('../config.js');

test('credential-looking literal is an error', () => {
  const { findings } = check('.env | DB_PASSWORD: supersecret1');
  const f = findings.find((x) => x.code === 'HARDCODED_SECRET_HINT');
  assert.ok(f && f.level === 'error');
});

test('public acl is flagged as public access', () => {
  const { findings } = check('main.tf | acl = "public-read"');
  assert.ok(findings.some((f) => f.code === 'PUBLIC_ACCESS_HINT'));
});

test('unpinned version and latest tag are flagged', () => {
  const { findings } = check('main.tf | version = "latest"\nDockerfile | image: postgres:latest');
  assert.ok(findings.some((f) => f.code === 'UNPINNED_VERSION'));
  assert.ok(findings.some((f) => f.code === 'LATEST_TAG'));
});

test('wildcard select is flagged', () => {
  const { findings } = check('models/orders.sql | select * from raw_orders');
  assert.ok(findings.some((f) => f.code === 'WILDCARD_SELECT'));
});

test('sql models without any test config are flagged', () => {
  const { findings } = check('models/a.sql | select id from x\nmodels/b.sql | select id from y');
  assert.ok(findings.some((f) => f.code === 'MODELS_WITHOUT_TESTS'));
});

test('pipeline config without retry hint is flagged', () => {
  const { findings } = check('sync.yml | name: airbyte daily sync');
  assert.ok(findings.some((f) => f.code === 'NO_RETRY_HINT'));
});

test('clean config yields the clean note and malformed lines are unparsed', () => {
  const { findings } = check('main.tf | version = "1.5.2"\nnot valid');
  assert.ok(findings.some((f) => f.code === 'UNPARSED'));
  const clean = check('main.tf | version = "1.5.2"');
  assert.ok(clean.findings.some((f) => f.code === 'CONFIG_CLEAN'));
});
