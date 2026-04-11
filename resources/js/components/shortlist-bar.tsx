import { Link } from '@inertiajs/react';

import { useShortlist } from '@/hooks/use-shortlist';

const C = {
    navy: '#0B1D3A',
    gold: '#D4A853',
    surface: '#FFFFFF',
    faint: '#9C9689',
    border: '#E5E2DB',
    red: '#991B1B',
};

export default function ShortlistBar() {
    const { items, count, maxItems, compareUrl, remove, clear } = useShortlist();

    if (count === 0) return null;

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-50 border-t"
            style={{
                backgroundColor: C.surface,
                borderColor: C.border,
                boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
            }}
        >
            <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
                {/* Saved items */}
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold" style={{ color: C.navy }}>
                        {count} van {maxItems} bewaard
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                        {items.map((item) => (
                            <span
                                key={item.id}
                                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]"
                                style={{ borderColor: C.border, color: C.navy }}
                            >
                                {item.address.split(',')[0]}
                                <button
                                    onClick={() => remove(item.id)}
                                    type="button"
                                    className="ml-0.5 font-bold"
                                    style={{ color: C.faint }}
                                    title="Verwijderen"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                    {count >= 2 && compareUrl && (
                        <Link
                            href={compareUrl}
                            className="rounded-md px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
                            style={{ backgroundColor: C.navy }}
                        >
                            Vergelijk ({count})
                        </Link>
                    )}
                    <button
                        onClick={clear}
                        type="button"
                        className="rounded-md px-3 py-2 text-[10px] font-medium"
                        style={{ color: C.faint }}
                    >
                        Wis
                    </button>
                </div>
            </div>
        </div>
    );
}