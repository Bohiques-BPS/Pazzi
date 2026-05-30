
const STORAGE_PREFIX = 'pazzi_page_visits_';

// Paths that should never be tracked
const EXCLUDED_PREFIXES = [
    '/store/',
    '/activate',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/checkout',
    '/order-confirmation',
    '/project-client',
    '/client-dashboard',
];

interface PageVisitRecord {
    count: number;
    lastVisit: string; // ISO string
}

function storageKey(userId: string): string {
    return STORAGE_PREFIX + userId;
}

function readVisits(userId: string): Record<string, PageVisitRecord> {
    try {
        const raw = localStorage.getItem(storageKey(userId));
        return raw ? (JSON.parse(raw) as Record<string, PageVisitRecord>) : {};
    } catch {
        return {};
    }
}

/**
 * Increment the visit counter for `path` for the given user.
 * Call this on every route change in MainLayout.
 */
export function recordPageVisit(userId: string, path: string): void {
    if (!userId || !path || path === '/') return;
    if (EXCLUDED_PREFIXES.some(prefix => path.startsWith(prefix))) return;

    try {
        const visits = readVisits(userId);
        const existing = visits[path] ?? { count: 0, lastVisit: '' };
        visits[path] = {
            count: existing.count + 1,
            lastVisit: new Date().toISOString(),
        };
        localStorage.setItem(storageKey(userId), JSON.stringify(visits));
    } catch {
        // Fail silently — tracking is non-critical
    }
}

/**
 * Return the top `limit` most-visited paths for the user,
 * sorted descending by visit count.
 */
export function getTopVisitedPaths(userId: string, limit = 8): string[] {
    if (!userId) return [];
    const visits = readVisits(userId);
    return Object.entries(visits)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, limit)
        .map(([path]) => path);
}

/**
 * Return the total number of distinct pages tracked for the user.
 * Useful to know if there's enough history to show dynamic links.
 */
export function getTrackedPageCount(userId: string): number {
    return Object.keys(readVisits(userId)).length;
}
