import test from 'node:test';
import assert from 'node:assert/strict';
import { alignMinuteSeries, matchSampleTimes, validSampleTimes } from '../lib/series.mjs';

test('keys samples by their recorded minute when the first tick is after 0:00', () => {
  const aligned = alignMinuteSeries([415, 837, 1290], [120, 180, 240]);

  assert.equal(aligned.basis, 'recorded_times');
  assert.deepEqual(aligned.values, [null, null, 415, 837, 1290]);
});

test('drops a pre-horn tick instead of shifting every later minute', () => {
  const aligned = alignMinuteSeries([0, 10, 20, 30], [-60, 0, 60, 120]);

  assert.deepEqual(aligned.values, [10, 20, 30]);
});

test('drops a series whose length disagrees with its recorded times', () => {
  assert.deepEqual(alignMinuteSeries([1, 2], [0, 60, 120]), { values: null, basis: 'inconsistent' });
  assert.deepEqual(alignMinuteSeries([1, 2], [0, 90]), { values: null, basis: 'inconsistent' });
  assert.deepEqual(alignMinuteSeries([1, 2], [60, 0]), { values: null, basis: 'inconsistent' });
});

test('keeps the historical index meaning only when no times are recorded', () => {
  assert.deepEqual(alignMinuteSeries([5, 6], undefined), { values: [5, 6], basis: 'array_index' });
  assert.deepEqual(alignMinuteSeries([], [0, 60]), { values: [], basis: null });
  assert.deepEqual(alignMinuteSeries(undefined, [0]), { values: null, basis: null });
});

test('validates sample times as increasing whole minutes', () => {
  assert.equal(validSampleTimes([0, 60, 120]), true);
  assert.equal(validSampleTimes([0, 60, 60]), false);
  assert.equal(validSampleTimes([0, 61]), false);
  assert.equal(validSampleTimes(null), false);
});

test('derives match sample times from the players shared ticks', () => {
  const players = [{ times: [-60, 0, 60] }, { times: [-60, 0, 60] }, { gold_t: [] }];

  assert.deepEqual(matchSampleTimes(players), { times: [0, 60], reason: null });
  assert.deepEqual(matchSampleTimes([{ times: [0, 60] }, { times: [0, 120] }]), { times: null, reason: 'sample_times_inconsistent' });
  assert.deepEqual(matchSampleTimes([{}, {}]), { times: null, reason: 'sample_times_unavailable' });
});
