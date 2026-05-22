import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "./config";
const RETRY_STATUS = new Set([429, 503]);
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 800;
/**
 * Універсальна функція запиту з підтримкою JWT та ретраїв
 */
async function request(path, options = {}, abortSignal, attempt = 0) {
    const url = `${API_BASE_URL}${path}`;
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const signal = abortSignal
        ? mergeSignals(abortSignal, controller.signal)
        : controller.signal;
    const headers = new Headers(options.headers || {});
    // Додаємо JWT токен, якщо він є у сховищі
    const token = localStorage.getItem("jwt_token");
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    options.headers = headers;
    let response;
    try {
        response = await fetch(url, { ...options, signal });
    }
    catch (e) {
        clearTimeout(timerId);
        const isAbort = e instanceof DOMException && e.name === "AbortError";
        throw {
            status: 0,
            code: isAbort ? "TIMEOUT" : "NETWORK_ERROR",
            message: isAbort ? "Час очікування вичерпано" : "Помилка мережі",
            details: e instanceof Error ? e.message : String(e),
        };
    }
    finally {
        clearTimeout(timerId);
    }
    // Обробка 401 (Unauthorized) — сесія завершена
    if (response.status === 401) {
        localStorage.removeItem("jwt_token");
        // Подія для main.ts, щоб показати форму входу
        window.dispatchEvent(new Event("auth_failed"));
    }
    // Повторні спроби для безпечних запитів
    const method = (options.method ?? "GET").toUpperCase();
    if ((method === "GET") && RETRY_STATUS.has(response.status) && attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_BASE_DELAY_MS * Math.pow(2, attempt)));
        return request(path, options, abortSignal, attempt + 1);
    }
    if (response.status === 204)
        return null;
    const rawText = await response.text();
    if (response.ok) {
        try {
            return JSON.parse(rawText);
        }
        catch {
            return rawText;
        }
    }
    const payload = JSON.parse(rawText || "{}");
    throw {
        status: response.status,
        code: payload.error?.code || "HTTP_ERROR",
        message: payload.error?.message || `Помилка ${response.status}`,
        details: payload.error?.details || rawText,
    };
}
/** * API для автентифікації
 */
export const authApi = {
    async login(name, passwordRaw) {
        const res = await request("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, password: passwordRaw }),
        });
        localStorage.setItem("jwt_token", res.token);
        localStorage.setItem("user_name", name);
        return res;
    },
    async register(name, passwordRaw) {
        return request("/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, password: passwordRaw }),
        });
    },
    logout() {
        localStorage.removeItem("jwt_token");
        localStorage.removeItem("user_name");
        window.location.reload();
    }
};
export const getUsers = () => request("/auth/users", { method: "GET" });
/** * API для інцидентів
 */
export const getIncidents = (params, signal) => request(`/incidents?${new URLSearchParams(params)}`, { method: "GET" }, signal);
export const createIncident = (dto) => request("/incidents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
});
export const updateIncident = (id, dto) => request(`/incidents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
});
export const getIncidentById = (id) => request(`/incidents/${encodeURIComponent(id)}`, { method: "GET" });
export const deleteIncident = (id) => request(`/incidents/${encodeURIComponent(id)}`, { method: "DELETE" });
export const getThreatStats = (tag) => request(`/incidents/threat-stats?tag=${encodeURIComponent(tag)}`);
export const getStats = () => request("/incidents/stats", { method: "GET" });
export const getMostFrequent = () => request("/incidents/most-frequent", { method: "GET" });
function mergeSignals(...signals) {
    const c = new AbortController();
    signals.forEach(s => s.addEventListener("abort", () => c.abort(s.reason), { once: true }));
    return c.signal;
}
