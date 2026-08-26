import { SourceError, requestJson } from './http.mjs';

const DEFAULT_ENDPOINT = 'https://api.stratz.com/graphql';

const MATCH_RUNTIME_QUERY = `query MatchRuntime($matchId: Long!) {
  match(id: $matchId) {
    id didRadiantWin durationSeconds startDateTime gameVersionId
    gameMode lobbyType bracket rank radiantKills direKills
    topLaneOutcome midLaneOutcome bottomLaneOutcome
    pickBans { isPick heroId order bannedHeroId isRadiant playerIndex }
    players {
      steamAccountId heroId isRadiant position lane roleBasic
      kills deaths assists numLastHits numDenies goldPerMinute
      experiencePerMinute networth heroDamage towerDamage heroHealing imp
      item0Id item1Id item2Id item3Id item4Id item5Id
      playbackData {
        abilityUsedEvents { time abilityId }
        itemUsedEvents { time itemId }
        playerUpdatePositionEvents { time x y }
        killEvents { time target byAbility byItem positionX positionY isGank isSmoke }
        deathEvents { time attacker byAbility byItem positionX positionY timeDead isFeed }
        assistEvents { time target positionX positionY }
        csEvents { time npcId byAbility byItem gold xp positionX positionY isCreep isNeutral isAncient }
        purchaseEvents { time itemId }
        runeEvents { time rune action gold positionX positionY }
      }
    }
  }
}`;

function graphqlErrorFields(errors) {
  const fields = new Set();
  for (const error of errors) {
    const match = /(?:Cannot query field|Field)\s+"([^"]+)"/i.exec(error?.message ?? '');
    if (match) fields.add(match[1]);
  }
  return [...fields];
}

function isMatch(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function createStratzClient({ apiKey, fetchImpl = fetch, endpoint = DEFAULT_ENDPOINT } = {}) {
  return {
    async loadMatch(matchId) {
      if (!apiKey) return { status: 'unavailable', reason: 'missing_token' };

      try {
        const response = await requestJson(endpoint, {
          fetchImpl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'STRATZ_API',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ query: MATCH_RUNTIME_QUERY, variables: { matchId } }),
        });
        const payload = response.data;
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
          throw new SourceError('invalid_response', 'Malformed GraphQL response');
        }
        if (Array.isArray(payload.errors) && payload.errors.length > 0) {
          return { status: 'failed', error: { code: 'graphql', fields: graphqlErrorFields(payload.errors) } };
        }
        if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data) || !Object.hasOwn(payload.data, 'match')) {
          throw new SourceError('invalid_response', 'Malformed GraphQL response');
        }
        const match = payload.data.match;
        if (match === null) return { status: 'not_found' };
        if (!isMatch(match)) throw new SourceError('invalid_response', 'Malformed GraphQL response');
        return match ? { status: 'ready', match } : { status: 'not_found' };
      } catch (error) {
        const code = error instanceof SourceError ? error.code : 'unknown';
        return { status: 'failed', error: { code } };
      }
    },
  };
}
