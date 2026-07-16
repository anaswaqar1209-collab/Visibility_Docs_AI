import { clearAuthState, getAuthValue, setAuthValue } from "./authSession";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100/api";

async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = getAuthValue("refreshToken") || getAuthValue("refresh_token");
    if (!refreshToken) return null;

    const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const accessToken = data?.data?.accessToken;
    if (accessToken) {
        setAuthValue("accessToken", accessToken);
        if (data?.data?.refreshToken) setAuthValue("refreshToken", data.data.refreshToken);
        return accessToken;
    }
    return null;
}

export async function apiRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = endpoint.startsWith("http")
        ? endpoint
        : `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    let token = getAuthValue("accessToken") || getAuthValue("token");

    const doFetch = async (accessToken: string | null) => {
        const headers = new Headers(options.headers || {});
        if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }
        if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
        return fetch(url, { ...options, headers });
    };

    let res = await doFetch(token);
    if (res.status === 401) {
        const next = await refreshAccessToken();
        if (next) {
            res = await doFetch(next);
        } else {
            clearAuthState();
        }
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.message || data.error || `Request failed (${res.status})`);
    }
    return data as T;
}

export async function apiFetchBlob(
    endpoint: string,
    options: RequestInit = {}
): Promise<Blob> {
    const url = endpoint.startsWith("http")
        ? endpoint
        : `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    let token = getAuthValue("accessToken") || getAuthValue("token");

    const doFetch = async (accessToken: string | null) => {
        const headers = new Headers(options.headers || {});
        if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
        return fetch(url, { ...options, headers });
    };

    let res = await doFetch(token);
    if (res.status === 401) {
        const next = await refreshAccessToken();
        if (next) {
            res = await doFetch(next);
        } else {
            clearAuthState();
        }
    }

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || `Request failed (${res.status})`);
    }

    return res.blob();
}

export { API_BASE };
