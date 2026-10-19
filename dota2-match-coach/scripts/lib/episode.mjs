// A navigation index into the published evidence, not a reconstruction of replay state.
export function buildEpisode(model, at) {
  const duration = model.match?.durationSeconds?.value;
  if (!Number.isSafeInteger(at) || at < 0 || !Number.isFinite(duration) || at > duration) {
    throw Object.assign(new Error('episode_out_of_match'), { code: 'episode_out_of_match' });
  }
  const start = Math.max(0, at - 30);
  const end = Math.min(duration, at + 30);
  const references = [];
  const add = (path, rows) => {
    if (!Array.isArray(rows)) return;
    rows.forEach((row, index) => {
      if (Number.isFinite(row?.time) && row.time >= start && row.time <= end) {
        references.push({ path, index, time: row.time });
      }
    });
  };
  add('deathAnalysis.contexts', model.deathAnalysis?.contexts);
  for (const [index, context] of (model.deathAnalysis?.contexts ?? []).entries()) {
    for (const kind of ['ownAbilityUses', 'ownItemUses', 'nearbyDeaths', 'nearbyKills']) {
      add(`deathAnalysis.contexts.${index}.${kind}`, context[kind]);
    }
  }
  add('items.purchases', model.items?.purchases);
  if (model.objectives?.status === 'ready') add('objectives.events', model.objectives.events);
  if (model.buybacks?.status === 'ready') add('buybacks.selectedPlayer', model.buybacks.selectedPlayer);
  if (model.wards?.status === 'ready') add('wards.selectedPlayer.placements', model.wards.selectedPlayer?.placements);
  for (const metric of ['earnedGold', 'xp', 'netWorth']) {
    if (model.teamEconomy?.status !== 'ready') continue;
    const values = model.teamEconomy.measures?.[metric]?.values ?? [];
    values.forEach((value, minute) => {
      if (Number.isFinite(value) && minute * 60 >= start && minute * 60 <= end) {
        references.push({ path: `teamEconomy.measures.${metric}.values`, index: minute, time: minute * 60 });
      }
    });
  }
  references.sort((a, b) => a.time - b.time || a.path.localeCompare(b.path) || a.index - b.index);
  return {
    at, start, end,
    status: references.length ? 'ready' : 'unavailable',
    reason: references.length ? null : 'no_recorded_events_in_window',
    references,
    limitations: ['published_evidence_only', 'not_continuous_replay', 'context_outside_window_may_matter'],
  };
}
