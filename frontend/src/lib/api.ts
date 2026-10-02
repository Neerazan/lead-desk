export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Single in-flight refresh promise to guarantee only one refresh request is made
let refreshPromise: Promise<boolean> | null = null;
const authFailureListeners = new Set<() => void>();

export function onAuthFailure(listener: () => void): () => void {
  authFailureListeners.add(listener);
  return () => {
    authFailureListeners.delete(listener);
  };
}

function triggerAuthFailure(): void {
  for (const listener of authFailureListeners) {
    listener();
  }
}

async function requestTokenRefresh(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const config: RequestInit = {
    ...options,
    credentials: 'include',
    headers,
  };

  let response: Response;
  try {
    response = await fetch(endpoint, config);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network connection error';
    throw new ApiError(0, message);
  }

  const isAuthRoute =
    endpoint.includes('/api/auth/login') ||
    endpoint.includes('/api/auth/refresh') ||
    endpoint.includes('/api/auth/logout');

  // Handle 401 Unauthorized with silent token refresh
  if (response.status === 401 && !isAuthRoute) {
    const refreshed = await requestTokenRefresh();

    if (refreshed) {
      // Retry original request once with newly minted access cookie
      try {
        response = await fetch(endpoint, config);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Retry failed';
        throw new ApiError(0, message);
      }
    } else {
      triggerAuthFailure();
      const errData = await response.json().catch(() => ({}));
      const message =
        errData.detail || errData.error || 'Your session has expired. Please log in again.';
      throw new ApiError(401, message, errData);
    }
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    let message = 'An unexpected error occurred';

    if (typeof errData.detail === 'string') {
      message = errData.detail;
    } else if (Array.isArray(errData.detail) && errData.detail.length > 0) {
      // Pydantic validation error array
      message = errData.detail.map((d: { msg?: string; loc?: string[] }) => d.msg || 'Invalid field').join(', ');
    } else if (errData.error) {
      message = errData.error;
    } else if (response.statusText) {
      message = response.statusText;
    }

    throw new ApiError(response.status, message, errData);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}
