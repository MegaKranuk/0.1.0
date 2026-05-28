const CACHE_TTL_MS = 30000;
const store = new Map();
export function cacheGet(key) {
    const entry = store.get(key);
    if (!entry)
        return null;
    if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
    }
    return entry.data;
}
export function cacheSet(key, data) {
    store.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}
export function invalidateAll() {
    store.clear();
}
