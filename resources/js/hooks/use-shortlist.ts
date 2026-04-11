import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'huischeck_shortlist';
const MAX_FREE = 3;
const MAX_PAID = 10;

export interface ShortlistItem {
    id: number;
    address: string;
    postcode: string;
    city: string;
    energyLabel?: string | null;
    bouwjaar?: number | null;
    costMonth?: number | null;
    addedAt: string;
}

function getStore(): ShortlistItem[] {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function setStore(items: ShortlistItem[]) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('shortlist-change'));
}

// For useSyncExternalStore
function subscribe(callback: () => void) {
    window.addEventListener('shortlist-change', callback);
    window.addEventListener('storage', callback);
    return () => {
        window.removeEventListener('shortlist-change', callback);
        window.removeEventListener('storage', callback);
    };
}

function getSnapshot(): string {
    return window.localStorage.getItem(STORAGE_KEY) ?? '[]';
}

export function useShortlist() {
    const raw = useSyncExternalStore(subscribe, getSnapshot, () => '[]');
    const items: ShortlistItem[] = JSON.parse(raw);

    const add = useCallback((item: ShortlistItem) => {
        const current = getStore();
        if (current.length >= MAX_FREE) return false;
        if (current.some((i) => i.id === item.id)) return true; // already saved
        setStore([...current, { ...item, addedAt: new Date().toISOString() }]);
        return true;
    }, []);

    const remove = useCallback((id: number) => {
        setStore(getStore().filter((i) => i.id !== id));
    }, []);

    const isSaved = useCallback(
        (id: number) => items.some((i) => i.id === id),
        [items],
    );

    const clear = useCallback(() => {
        setStore([]);
    }, []);

    return {
        items,
        count: items.length,
        maxItems: MAX_FREE,
        isFull: items.length >= MAX_FREE,
        add,
        remove,
        isSaved,
        clear,
        compareUrl: items.length >= 2 ? `/compare?ids=${items.map((i) => i.id).join(',')}` : null,
    };
}