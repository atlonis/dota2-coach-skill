import { spawnSync } from 'node:child_process';

const PROXY_VARIABLES = ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy'];

// Node's built-in fetch ignores HTTPS_PROXY unless proxy support is switched on
// at start-up (NODE_USE_ENV_PROXY, Node 22.21+/24.5+), so behind a proxy an entry
// script restarts itself once with it on. Returns the child's exit code, or null
// when no restart is needed.
export function relaunchWithProxySupport({ env = process.env, execArgv = process.execArgv, argv = process.argv, spawn = spawnSync } = {}) {
  const proxied = PROXY_VARIABLES.some((name) => env[name]);
  if (!proxied || env.NODE_USE_ENV_PROXY || execArgv.includes('--use-env-proxy')) return null;
  const child = spawn(process.execPath, [...execArgv, argv[1], ...argv.slice(2)], {
    stdio: 'inherit',
    env: { ...env, NODE_USE_ENV_PROXY: '1' },
  });
  return child.status ?? 4;
}
