interface RequestOptions extends Omit<RequestInit, "body"> {
    body?: unknown
    timeoutMs?: number
}

export type API_CONFIG = {
    BASE: string;
    TOKEN?: string | undefined;
}

export const API = {
    BASE: '',
    TOKEN: undefined
}

export class ApiError extends Error {
    public url: string;
    public status: number;
    public message: string;

    constructor(status: number, message: string) {
      super(message);

      this.name = 'ApiError';
      this.status = status
      this.message = message
    }
}

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { body, timeoutMs = 10000, headers, ...rest } = options
  
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
  
    try {
      const response = await fetch(`${API.BASE}${path}`, {
        ...rest,
        headers: {
          "Content-Type": "application/json",
          ...(API.TOKEN ? { Authorization: `Bearer ${API.TOKEN}` } : {}),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
  
      if (response.status === 401) {
        // token expired or invalid — clean up and force re-login
        API.TOKEN = ""
        localStorage.removeItem("access_token")
        window.location.href = "/login"
        throw new Error("Session expired")
      }
  
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        const error = new ApiError(response.status, errorBody?.detail || `Request Failed: ${response.status}`)
        throw error
      }
  
      if (response.status === 204) {
        return undefined as T
      }
  
      return (await response.json()) as T
    } finally {
      clearTimeout(timeout)
    }
  }
  
const apiClient = {
get: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: "GET" }),

post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: "POST", body }),

put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: "PUT", body }),

patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body }),

delete: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
}

export default apiClient