import assert from 'node:assert/strict';
import test from 'node:test';
import { contrastByte, rampError } from '../src/style.ts';

test('neutral contrast preserves the source and stronger contrast clips around mid-gray', () => {
  for (const value of [0, 32, 127, 128, 200, 255]) assert.equal(contrastByte(value, 1), value);
  assert.equal(contrastByte(32, 2), 0);
  assert.equal(contrastByte(224, 2), 255);
  assert.equal(contrastByte(128, 2), 128);
});

test('ramps require visible printable ASCII without removing spaces', () => {
  assert.equal(rampError(' .:@'), '');
  assert.equal(rampError('@'), '');
  assert.match(rampError(''), /at least one visible/);
  assert.match(rampError('   '), /at least one visible/);
  assert.match(rampError('☀'), /printable ASCII/);
  assert.match(rampError('a\nb'), /printable ASCII/);
});
