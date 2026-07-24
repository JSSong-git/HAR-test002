const MASK = "***MASKED***";

const SENSITIVE_HEADER_NAMES = [
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "proxy-authorization",
];

const SENSITIVE_QUERY_KEYS = [
  "access_token",
  "token",
  "auth",
  "api_key",
  "apikey",
  "session",
  "jsessionid",
  "password",
  "secret",
];

function isSensitiveName(name: string): boolean {
  const n = name.toLowerCase();
  return (
    SENSITIVE_HEADER_NAMES.includes(n) ||
    SENSITIVE_QUERY_KEYS.some((k) => n.includes(k))
  );
}

function maskNameValueList(
  list: Array<{ name: string; value: string }> | undefined,
): Array<{ name: string; value: string }> | undefined {
  if (!list) return list;
  return list.map((item) =>
    isSensitiveName(item.name) ? { ...item, value: MASK } : { ...item },
  );
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const key of [...u.searchParams.keys()]) {
      if (isSensitiveName(key)) u.searchParams.set(key, MASK);
    }
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Deep-clone HAR-like JSON and mask secrets in headers/cookies/query.
 * Does not alter numeric timings or sizes (Fact-Only safe for display/export).
 */
export function sanitizeHarForExport(raw: unknown): unknown {
  const clone = structuredClone(raw) as {
    log?: {
      entries?: Array<{
        request?: {
          url?: string;
          headers?: Array<{ name: string; value: string }>;
          cookies?: Array<{ name: string; value: string }>;
          queryString?: Array<{ name: string; value: string }>;
        };
        response?: {
          headers?: Array<{ name: string; value: string }>;
          cookies?: Array<{ name: string; value: string }>;
        };
      }>;
    };
  };

  const entries = clone.log?.entries;
  if (!entries) return clone;

  for (const entry of entries) {
    if (entry.request) {
      if (entry.request.url) entry.request.url = maskUrl(entry.request.url);
      entry.request.headers = maskNameValueList(entry.request.headers);
      entry.request.cookies = maskNameValueList(entry.request.cookies);
      entry.request.queryString = maskNameValueList(entry.request.queryString);
    }
    if (entry.response) {
      entry.response.headers = maskNameValueList(entry.response.headers);
      entry.response.cookies = maskNameValueList(entry.response.cookies);
    }
  }
  return clone;
}

export function maskTextSecrets(text: string): string {
  return text
    .replace(/(Authorization:\s*)(Bearer\s+)?\S+/gi, `$1$2${MASK}`)
    .replace(/(Cookie:\s*)\S+/gi, `$1${MASK}`);
}
