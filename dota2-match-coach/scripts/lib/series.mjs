// OpenDota samples every per-minute series (`gold_t`, `xp_t`, `lh_t`, `dn_t`,
// `hero_damage_t`, `networth_t`) on the same interval ticks and records the game
// time of each tick in `times`. The first tick is not always 0:00: in a replay
// whose ticks start at 2:00, index 10 holds the value at 12:00. Samples are
// therefore re-keyed by their recorded minute. A series whose length disagrees
// with `times` has unknown timing and is dropped rather than guessed. Without
// `times`, an index keeps its historical meaning of minutes from 0:00.

export function validSampleTimes(times) {
  return Array.isArray(times) && times.every((time, index) => Number.isSafeInteger(time)
    && time % 60 === 0 && (index === 0 || time > times[index - 1]));
}

function keyedByMinute(values, times) {
  const aligned = [];
  for (let index = 0; index < times.length; index += 1) {
    const minute = times[index] / 60;
    if (minute >= 0) aligned[minute] = values[index];
  }
  return Array.from(aligned, (value) => value ?? null);
}

// `basis` names how minutes were established: `recorded_times`, `array_index`, or
// `inconsistent` when the series was dropped. An empty series has no basis.
export function alignMinuteSeries(values, times) {
  if (!Array.isArray(values)) return { values: null, basis: null };
  if (values.length === 0) return { values: [], basis: null };
  if (times == null) return { values: values.slice(), basis: 'array_index' };
  if (!validSampleTimes(times) || times.length !== values.length) return { values: null, basis: 'inconsistent' };
  return { values: keyedByMinute(values, times), basis: 'recorded_times' };
}

// A match-level series such as `radiant_gold_adv` is built only from ticks at or
// after 0:00, so it lines up with the non-negative part of the players' shared
// `times`. Players whose recorded ticks disagree leave the match timing unknown.
export function matchSampleTimes(players) {
  const recorded = (Array.isArray(players) ? players : [])
    .map((player) => player?.times)
    .filter((times) => times != null);
  if (recorded.length === 0) return { times: null, reason: 'sample_times_unavailable' };
  if (!recorded.every(validSampleTimes)) return { times: null, reason: 'sample_times_inconsistent' };
  const signature = JSON.stringify(recorded[0]);
  if (!recorded.every((times) => JSON.stringify(times) === signature)) {
    return { times: null, reason: 'sample_times_inconsistent' };
  }
  return { times: recorded[0].filter((time) => time >= 0), reason: null };
}
