export function computeCapabilities(model = {}) {
  const contexts = Array.isArray(model.deathAnalysis?.contexts)
    ? model.deathAnalysis.contexts
    : [];
  const participants = Array.isArray(model.participants) ? model.participants : [];
  const events = model.events ?? {};
  const timedSelectedEvent = Object.values(events).some((rows) =>
    Array.isArray(rows) && rows.some((row) => Number.isFinite(row?.time)));

  return {
    scoreboard: model.player?.accountId?.value != null
      && model.match?.durationSeconds?.value != null,
    phaseAggregates: Boolean(model.phases?.some((phase) =>
      ['gold', 'xp', 'lh'].some((name) => phase.metrics?.[name] != null))),
    draft: model.draft?.complete === true
      && model.draft?.radiant?.length === 5
      && model.draft?.dire?.length === 5,
    peerBaseline: Boolean(model.baseline?.comparisons?.length),
    selectedTimeline: timedSelectedEvent,
    allPlayerPositions: participants.length === 10
      && participants.every((row) => row.positionTimelineAvailable === true),
    deathContext: contexts.length > 0
      && model.deathAnalysis?.unresolvedCount === 0
      && contexts.every((row) => row.observations?.contextIncomplete === false),
    deathPattern: Boolean(model.deathAnalysis?.patterns?.length),
    currentPatch: model.patch?.isCurrentExactPatch?.value === true,
  };
}

export function qualityFromCapabilities(capabilities, warnings = []) {
  const labels = {
    scoreboard: 'scoreboard',
    phaseAggregates: 'phase aggregates',
    draft: 'complete draft',
    peerBaseline: 'peer baseline',
    selectedTimeline: 'selected-player timeline',
    allPlayerPositions: 'positions for all participants',
    deathContext: 'complete death context',
    currentPatch: 'current exact patch',
  };
  return {
    mode: capabilities.scoreboard && capabilities.draft
      && capabilities.selectedTimeline && capabilities.currentPatch ? 'full' : 'degraded',
    capabilities,
    missing: Object.entries(capabilities)
      .filter(([name, ready]) => !ready && labels[name])
      .map(([name]) => labels[name]),
    warnings: [...warnings],
  };
}
