import { SourceError, requestJson } from './http.mjs';

const DEFAULT_ENDPOINT = 'https://www.dota2.com/datafeed/patchnoteslist?language=english';

export function resolveTimeline(patches, startTime) {
  const ordered = patches
    .filter((patch) => typeof patch?.patch_number === 'string' && Number.isFinite(patch?.patch_timestamp))
    .sort((a, b) => a.patch_timestamp - b.patch_timestamp);
  const match = ordered.filter((patch) => patch.patch_timestamp <= startTime).at(-1) ?? null;
  const current = ordered.at(-1) ?? null;
  return {
    matchPatch: match?.patch_number ?? null,
    currentPatch: current?.patch_number ?? null,
    currentPatchStartTime: current?.patch_timestamp ?? null,
    isCurrentExactPatch: Boolean(match && current && match.patch_number === current.patch_number),
  };
}

export function createValveClient({ fetchImpl = fetch, endpoint = DEFAULT_ENDPOINT } = {}) {
  return {
    async resolvePatch(startTime) {
      try {
        const { data } = await requestJson(endpoint, { fetchImpl });
        if (!Array.isArray(data?.patches)) {
          throw new SourceError('invalid_response', 'Malformed Valve patch timeline');
        }
        return { status: 'ready', ...resolveTimeline(data.patches, startTime) };
      } catch (error) {
        return { status: 'failed', error: { code: error instanceof SourceError ? error.code : 'unknown' } };
      }
    },
  };
}
