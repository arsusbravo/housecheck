import { router, usePage } from '@inertiajs/react';
import { useCallback, useRef, useState } from 'react';

import type { AddressSuggestion } from '@/types/huischeck';

function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number) {
    let timer: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

interface AddressSearchProps {
    /** Compact mode for use in headers/navbars */
    compact?: boolean;
    /** Auto-focus the input on mount */
    autoFocus?: boolean;
    /** Placeholder text */
    placeholder?: string;
}

export default function AddressSearch({
    compact = false,
    autoFocus = false,
    placeholder = 'Voer een adres of postcode in...',
}: AddressSearchProps) {
    const { errors } = usePage().props as { errors: Record<string, string> };
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
    const [selected, setSelected] = useState<AddressSuggestion | null>(null);
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const fetchSuggestions = useCallback(
        debounce(async (q: string) => {
            if (q.length < 2) {
                setSuggestions([]);
                return;
            }
            setLoading(true);
            try {
                const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`);
                const data: AddressSuggestion[] = await res.json();
                setSuggestions(data);
            } catch {
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        }, 300),
        [],
    );

    function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
        setQuery(e.target.value);
        setSelected(null);
        fetchSuggestions(e.target.value);
    }

    function handleSelect(s: AddressSuggestion) {
        setQuery(s.label);
        setSelected(s);
        setSuggestions([]);
    }

    function handleCheck() {
        if (!selected) return;
        setChecking(true);
        router.post('/check', { pdok_id: selected.id, label: selected.label }, {
            onFinish: () => setChecking(false),
        });
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && selected) handleCheck();
    }

    return (
        <div className="relative">
            <div
                className="flex items-center overflow-hidden rounded-lg border"
                style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: selected ? '#0B1D3A' : '#D6D3CC',
                    boxShadow: compact ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'border-color 0.2s',
                }}
            >
                <div className={compact ? 'pl-3' : 'pl-4'} style={{ color: '#9C9689' }}>
                    <svg
                        width={compact ? '15' : '18'}
                        height={compact ? '15' : '18'}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={`flex-1 border-0 bg-transparent outline-none ${compact ? 'px-2 py-2.5 text-sm' : 'px-3 py-4 text-base'}`}
                    style={{ color: '#1A1A1A' }}
                    autoFocus={autoFocus}
                />
                {loading && (
                    <div className="pr-3">
                        <div
                            className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
                            style={{ borderColor: '#D4A853', borderTopColor: 'transparent' }}
                        />
                    </div>
                )}
                <button
                    onClick={handleCheck}
                    disabled={!selected || checking}
                    type="button"
                    className={`mr-1.5 rounded-md font-semibold transition-all ${compact ? 'px-4 py-1.5 text-xs' : 'px-5 py-2.5 text-sm'}`}
                    style={{
                        backgroundColor: selected && !checking ? '#0B1D3A' : '#E5E2DB',
                        color: selected && !checking ? '#FFFFFF' : '#9C9689',
                        cursor: selected && !checking ? 'pointer' : 'default',
                    }}
                >
                    {checking ? 'Bezig...' : 'Analyseer'}
                </button>
            </div>

            {errors?.address && !compact && (
                <div
                    className="mt-3 rounded-md border px-4 py-3 text-sm"
                    style={{ backgroundColor: '#FDF6F0', borderColor: '#E8C9B0', color: '#8B4513' }}
                >
                    {errors.address}
                </div>
            )}

            {suggestions.length > 0 && (
                <div
                    className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-lg border"
                    style={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#D6D3CC',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    }}
                >
                    {suggestions.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => handleSelect(s)}
                            type="button"
                            className={`block w-full border-b text-left transition-colors last:border-0 ${compact ? 'px-3 py-2.5 text-xs' : 'px-4 py-3 text-sm'}`}
                            style={{ borderColor: '#F0EDE8', color: '#1A1A1A' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F7F6F3')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}