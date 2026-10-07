import { db } from '@/db/database';

const CLIENT_ID_KEY = 'atlassian_client_id';
const CLIENT_SECRET_KEY = 'atlassian_client_secret';
const ACCESS_TOKEN_KEY = 'atlassian_access_token';
const REFRESH_TOKEN_KEY = 'atlassian_refresh_token';
const INSTANCE_URL_KEY = 'atlassian_instance_url';
const CLOUD_ID_KEY = 'atlassian_cloud_id';
const REDIRECT_URI = window.location.origin;
const OAUTH_STATE_KEY = 'atlassian_oauth_state';

const JIRA_CLOUD_SCOPES = 'read:jira-work read:jira-user offline_access';
const AUTH_ATLASSIAN_AUTHORIZE = 'https://auth.atlassian.com/authorize';
const AUTH_ATLASSIAN_TOKEN = 'https://auth.atlassian.com/oauth/token';
const AUTH_ATLASSIAN_TOKEN_PROXY = '/api/atlassian/oauth/token';
const API_ATLASSIAN_ACCESSIBLE_RESOURCES =
  'https://api.atlassian.com/oauth/token/accessible-resources';
const API_ATLASSIAN_ACCESSIBLE_RESOURCES_PROXY = '/api/jira-cloud/accessible-resources';

function isLocalAtlassianProxyHost(): boolean {
  const host = globalThis.location?.hostname ?? '';
  return host === 'localhost' || host === '127.0.0.1';
}

/** Atlassian’s token endpoint is not reliably callable from browser origins; use the dev proxy on localhost. */
function getCloudOAuthTokenUrl(): string {
  if (isLocalAtlassianProxyHost()) {
    return AUTH_ATLASSIAN_TOKEN_PROXY;
  }
  return AUTH_ATLASSIAN_TOKEN;
}

/** Ad blockers often block the real path because it contains `/oauth/token/`. */
function getAccessibleResourcesUrl(): string {
  if (isLocalAtlassianProxyHost()) {
    return API_ATLASSIAN_ACCESSIBLE_RESOURCES_PROXY;
  }
  return API_ATLASSIAN_ACCESSIBLE_RESOURCES;
}

/** Jira Cloud REST calls via `api.atlassian.com/ex/jira/{cloudId}`. */
export function getJiraCloudExApiBase(cloudId: string): string {
  if (isLocalAtlassianProxyHost()) {
    return `/api/jira-cloud/ex/jira/${cloudId}`;
  }
  return `https://api.atlassian.com/ex/jira/${cloudId}`;
}

export function isJiraCloud(instanceUrl: string): boolean {
  try {
    const host = new URL(instanceUrl.trim()).hostname.toLowerCase();
    return host.endsWith('.atlassian.net') || host === 'atlassian.com';
  } catch {
    return false;
  }
}

export interface AtlassianConfig {
  clientId: string;
  clientSecret: string;
  instanceUrl: string;
  cloudId?: string;
}

export interface AtlassianTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
}

export async function saveAtlassianConfig(config: AtlassianConfig): Promise<void> {
  const rows: { key: string; value: string }[] = [
    { key: CLIENT_ID_KEY, value: config.clientId },
    { key: CLIENT_SECRET_KEY, value: config.clientSecret },
    { key: INSTANCE_URL_KEY, value: config.instanceUrl },
  ];
  if (config.cloudId !== undefined) {
    rows.push({ key: CLOUD_ID_KEY, value: config.cloudId });
  }
  await db.settings.bulkPut(rows);
}

export async function getAtlassianConfig(): Promise<AtlassianConfig | null> {
  const [clientId, clientSecret, instanceUrl, cloudId] = await Promise.all([
    db.settings.get(CLIENT_ID_KEY),
    db.settings.get(CLIENT_SECRET_KEY),
    db.settings.get(INSTANCE_URL_KEY),
    db.settings.get(CLOUD_ID_KEY),
  ]);

  if (clientId?.value && clientSecret?.value && instanceUrl?.value) {
    return {
      clientId: clientId.value,
      clientSecret: clientSecret.value,
      instanceUrl: instanceUrl.value,
      ...(cloudId?.value ? { cloudId: cloudId.value } : {}),
    };
  }

  return null;
}

export async function saveAtlassianTokens(tokens: AtlassianTokens): Promise<void> {
  await db.settings.bulkPut([
    { key: ACCESS_TOKEN_KEY, value: tokens.accessToken },
    { key: REFRESH_TOKEN_KEY, value: tokens.refreshToken },
    ...(tokens.expiresAt ? [{ key: 'atlassian_expires_at', value: tokens.expiresAt.toString() }] : []),
  ]);
}

export async function getAtlassianTokens(): Promise<AtlassianTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    db.settings.get(ACCESS_TOKEN_KEY),
    db.settings.get(REFRESH_TOKEN_KEY),
  ]);

  if (accessToken?.value && refreshToken?.value) {
    return {
      accessToken: accessToken.value,
      refreshToken: refreshToken.value,
    };
  }

  return null;
}

export async function clearAtlassianTokens(): Promise<void> {
  await db.settings.bulkDelete([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, 'atlassian_expires_at', CLOUD_ID_KEY]);
}

export function validateAndClearOAuthState(stateFromUrl: string | null): boolean {
  const stored = sessionStorage.getItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(OAUTH_STATE_KEY);
  return !!stateFromUrl && stored === stateFromUrl;
}

export function initiateOAuthFlow(config: AtlassianConfig): void {
  if (isJiraCloud(config.instanceUrl)) {
    const state = crypto.randomUUID();
    sessionStorage.setItem(OAUTH_STATE_KEY, state);
    const authUrl = new URL(AUTH_ATLASSIAN_AUTHORIZE);
    authUrl.searchParams.set('audience', 'api.atlassian.com');
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('scope', JIRA_CLOUD_SCOPES);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('prompt', 'consent');
    window.location.href = authUrl.toString();
    return;
  }

  const authUrl = new URL(`${config.instanceUrl}/plugins/servlet/oauth/authorize`);
  authUrl.searchParams.set('oauth_token', '');
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', config.clientId);
  window.location.href = authUrl.toString();
}

interface AccessibleResource {
  id: string;
  url: string;
  name: string;
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/$/, '').toLowerCase();
}

function pickResourceForInstanceUrl(
  instanceUrl: string,
  resources: AccessibleResource[]
): AccessibleResource | null {
  if (resources.length === 0) return null;
  const instanceNorm = normalizeUrl(instanceUrl);
  const instanceHost = (() => {
    try {
      return new URL(instanceUrl.trim()).hostname.toLowerCase();
    } catch {
      return '';
    }
  })();
  const exact = resources.find((r) => normalizeUrl(r.url) === instanceNorm);
  if (exact) return exact;
  const byHost = resources.find((r) => {
    try {
      return new URL(r.url).hostname.toLowerCase() === instanceHost;
    } catch {
      return false;
    }
  });
  if (byHost) return byHost;
  return resources[0];
}

/**
 * Re-fetches cloud ID from accessible-resources when the stored cloud ID is missing.
 * Updates stored config and returns it if a matching resource is found.
 */
export async function refreshCloudIdFromToken(
  config: AtlassianConfig,
  accessToken: string
): Promise<AtlassianConfig | null> {
  if (!isJiraCloud(config.instanceUrl)) {
    return null;
  }
  const response = await fetch(getAccessibleResourcesUrl(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    return null;
  }
  const resources: AccessibleResource[] = await response.json();
  const resource = pickResourceForInstanceUrl(config.instanceUrl, resources);
  if (!resource?.id) {
    return null;
  }
  const updated: AtlassianConfig = {
    ...config,
    cloudId: resource.id,
    instanceUrl: normalizeUrl(resource.url) || config.instanceUrl,
  };
  await saveAtlassianConfig(updated);
  return updated;
}

export async function exchangeCodeForTokens(
  code: string,
  config: AtlassianConfig
): Promise<AtlassianTokens> {
  const isCloud = isJiraCloud(config.instanceUrl);
  const tokenUrl = isCloud
    ? getCloudOAuthTokenUrl()
    : `${config.instanceUrl}/plugins/servlet/oauth/access-token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    let message = 'Failed to exchange code for tokens';
    try {
      const parsed = JSON.parse(body) as {
        error_description?: string;
        message?: string;
      };
      if (parsed.error_description) {
        message = parsed.error_description;
      } else if (parsed.message) {
        message = parsed.message;
      }
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  const data = await response.json();
  const tokens: AtlassianTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
  };

  if (isCloud) {
    const resourcesRes = await fetch(getAccessibleResourcesUrl(), {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        Accept: 'application/json',
      },
    });
    if (resourcesRes.ok) {
      const resources: AccessibleResource[] = await resourcesRes.json();
      const resource = pickResourceForInstanceUrl(config.instanceUrl, resources);
      if (resource?.id) {
        const instanceUrlCanonical = normalizeUrl(resource.url) || config.instanceUrl;
        await saveAtlassianConfig({
          ...config,
          cloudId: resource.id,
          instanceUrl: instanceUrlCanonical,
        });
      } else {
        await db.settings.delete(CLOUD_ID_KEY);
      }
    } else {
      await db.settings.delete(CLOUD_ID_KEY);
    }
  }

  return tokens;
}

export async function refreshAccessToken(config: AtlassianConfig): Promise<AtlassianTokens> {
  const tokens = await getAtlassianTokens();
  if (!tokens) {
    throw new Error('No refresh token available');
  }

  const tokenUrl = isJiraCloud(config.instanceUrl)
    ? getCloudOAuthTokenUrl()
    : `${config.instanceUrl}/plugins/servlet/oauth/access-token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: tokens.refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  const data = await response.json();
  const newTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || tokens.refreshToken,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
  };

  await saveAtlassianTokens(newTokens);
  return newTokens;
}

export async function getValidAccessToken(): Promise<string | null> {
  const config = await getAtlassianConfig();
  if (!config) {
    return null;
  }

  const tokens = await getAtlassianTokens();
  if (!tokens) {
    return null;
  }

  const expiresAt = await db.settings.get('atlassian_expires_at');
  const expiresAtTime = expiresAt?.value ? parseInt(expiresAt.value, 10) : null;

  if (expiresAtTime && Date.now() >= expiresAtTime - 60000) {
    try {
      const refreshed = await refreshAccessToken(config);
      return refreshed.accessToken;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }

  return tokens.accessToken;
}
