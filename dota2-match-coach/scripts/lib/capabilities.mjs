export function computeCapabilities(model = {}) {
  const contexts = Array.isArray(model.deathAnalysis?.contexts)
    ? model.deathAnalysis.contexts
    : [];
  const participants = Array.isArray(model.participants) ? model.participants : [];
  const events = model.events ?? {};
  // A selected-player timeline: STRATZ playback events, or OpenDota's own logs of
  // the player's deaths and purchases from a parsed replay.
  const timedSelectedEvent = Object.values(events).some((rows) =>
    Array.isArray(rows) && rows.some((row) => Number.isFinite(row?.time)))
    || (typeof model.deathAnalysis?.timelineSource === 'string' && model.deathAnalysis.timelineSource.startsWith('opendota'))
    || (Array.isArray(model.items?.purchases) && model.items.purchases.some((row) => Number.isFinite(row?.time)));

  return {
    // A player who hides their account is still selected by slot.
    scoreboard: (model.player?.accountId?.value != null || Number.isInteger(model.player?.slot))
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
    individualDeathContext: contexts.some((row) => row.contextReady === true
      && row.observations?.contextIncomplete === false && row.unavailable?.length === 0),
    deathTimeline: model.deathAnalysis?.timelineSource != null && model.deathAnalysis?.unresolvedCount === 0,
    deathPattern: Boolean(model.deathAnalysis?.patterns?.length),
    laneNumbers: Array.isArray(model.players) && model.players.some((row) => row?.minute10 != null),
    allPlayersSummary: Array.isArray(model.players) && model.players.length === 10
      && model.players.every((row) => row?.source != null),
    percentiles: model.percentiles?.status === 'ready',
    teamEconomy: model.teamEconomy?.status === 'ready',
    objectiveTimeline: model.objectives?.status === 'ready',
    wardPlacements: model.wards?.status === 'ready',
    buybackLog: model.buybacks?.status === 'ready',
    skillBuild: model.skillBuild?.status === 'ready',
    currentMechanics: ['ready', 'partial'].includes(model.mechanics?.status),
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
    deathTimeline: 'complete death timeline',
    laneNumbers: 'lane numbers at 10:00',
    allPlayersSummary: 'all-player summary',
    percentiles: 'OpenDota percentiles',
    teamEconomy: 'team economy',
    objectiveTimeline: 'objective timeline',
    wardPlacements: 'ward placements',
    buybackLog: 'buyback log',
    skillBuild: 'skill build',
    currentMechanics: 'current-patch mechanics',
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
