import { Link } from '@inertiajs/react';

import AddressSearch from '@/components/address-search';
import HuisCheckLayout from '@/layouts/huischeck-layout';
import { useShortlist } from '@/hooks/use-shortlist';
import type { AddressReport } from '@/types/huischeck';

const C = {
    navy: '#0B1D3A',
    gold: '#D4A853',
    text: '#1A1A1A',
    muted: '#6B6560',
    faint: '#9C9689',
    border: '#E5E2DB',
    surface: '#FFFFFF',
    bg: '#F7F6F3',
    green: '#2D6A4F',
    greenBg: '#F0F7F2',
    amber: '#92400E',
    amberBg: '#FFFBEB',
    red: '#991B1B',
    redBg: '#FEF2F2',
} as const;

const serif = "'Libre Baskerville', serif";
const sans = "'Source Sans 3', sans-serif";

interface CompareProps {
    reports: AddressReport[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Label({ label }: { label: string | null | undefined }) {
    if (!label) return <span style={{ color: C.faint }}>—</span>;

    const colors: Record<string, string> = {
        'A+++++': '#065F46', 'A++++': '#047857', 'A+++': '#059669',
        'A++': '#10B981', 'A+': '#10B981', A: '#059669',
        B: '#84CC16', C: '#EAB308', D: '#F59E0B',
        E: '#F97316', F: '#EF4444', G: '#DC2626',
    };

    return (
        <span
            className="inline-block rounded px-2 py-0.5 text-xs font-bold text-white"
            style={{ backgroundColor: colors[label] ?? C.faint }}
        >
            {label}
        </span>
    );
}

function bestValue(reports: AddressReport[], getter: (r: AddressReport) => number | null | undefined, lower = true) {
    const values = reports.map(getter).filter((v): v is number => v != null);
    if (values.length === 0) return null;
    return lower ? Math.min(...values) : Math.max(...values);
}

function CellValue({
    value,
    suffix = '',
    best,
    lower = true,
}: {
    value: number | string | null | undefined;
    suffix?: string;
    best?: number | null;
    lower?: boolean;
}) {
    if (value == null) return <span style={{ color: C.faint }}>—</span>;

    const isBest = best != null && typeof value === 'number' && value === best;

    return (
        <span
            className={isBest ? 'font-bold' : ''}
            style={{ color: isBest ? C.green : C.text }}
        >
            {typeof value === 'number' ? value.toLocaleString('nl-NL') : value}
            {suffix}
            {isBest && ' ✓'}
        </span>
    );
}

// ── Row component ────────────────────────────────────────────────────────────

function Row({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            <td
                className="whitespace-nowrap py-2.5 px-3 text-xs font-semibold uppercase tracking-wider"
                style={{ color: C.faint, fontFamily: sans, fontSize: '10px' }}
            >
                {label}
            </td>
            {children}
        </tr>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

function Compare({ reports }: CompareProps) {
    const { remove } = useShortlist();

    const bestCost = bestValue(reports, (r) => r.energy_cost?.total.cost_month, true);
    const bestYear = bestValue(reports, (r) => r.building?.bouwjaar, false);
    const bestSize = bestValue(reports, (r) => r.building?.oppervlakte, false);

    function handleRemove(id: number) {
        remove(id);
        // Rebuild URL without this ID
        const remaining = reports.filter((r) => r.id !== id).map((r) => r.id);
        if (remaining.length >= 2) {
            window.location.href = `/compare?ids=${remaining.join(',')}`;
        } else {
            window.location.href = '/';
        }
    }

    return (
        <div>
            {/* Header */}
            <div style={{ backgroundColor: C.navy }}>
                <div className="mx-auto max-w-5xl px-3 py-2.5 sm:px-6 sm:py-3">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link
                            href="/"
                            className="shrink-0 text-[10px] font-bold uppercase tracking-widest sm:text-xs"
                            style={{ color: C.gold, fontFamily: sans }}
                        >
                            HuisCheck
                        </Link>
                        <div className="min-w-0 flex-1">
                            <AddressSearch compact placeholder="Zoek ander adres..." />
                        </div>
                    </div>
                </div>
            </div>

            {/* Title */}
            <div style={{ backgroundColor: C.surface, borderBottom: `1px solid ${C.border}` }}>
                <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
                    <h1
                        className="text-xl font-bold tracking-tight sm:text-2xl"
                        style={{ fontFamily: serif, color: C.navy }}
                    >
                        Vergelijk woningen
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm" style={{ color: C.muted }}>
                        {reports.length} adressen naast elkaar — het beste resultaat per categorie is{' '}
                        <span className="font-semibold" style={{ color: C.green }}>groen</span> gemarkeerd.
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="mx-auto max-w-5xl px-3 py-5 sm:px-6 sm:py-8">
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: C.border, backgroundColor: C.surface }}>
                    <table className="w-full text-sm" style={{ minWidth: reports.length * 200 + 140 }}>
                        <thead>
                            <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                                <th className="p-3 text-left" style={{ width: 140 }} />
                                {reports.map((r) => (
                                    <th key={r.id} className="p-3 text-left align-top" style={{ minWidth: 180 }}>
                                        <Link href={`/report/${r.id}`} className="hover:underline">
                                            <p className="text-sm font-bold" style={{ color: C.navy, fontFamily: sans }}>
                                                {r.address.split(',')[0]}
                                            </p>
                                            <p className="text-xs font-normal" style={{ color: C.muted }}>
                                                {r.postcode} {r.city}
                                            </p>
                                        </Link>
                                        <button
                                            onClick={() => handleRemove(r.id!)}
                                            type="button"
                                            className="mt-1.5 text-[10px] font-medium"
                                            style={{ color: C.red }}
                                        >
                                            Verwijderen
                                        </button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Building */}
                            <tr>
                                <td
                                    colSpan={reports.length + 1}
                                    className="px-3 pb-1 pt-4 text-xs font-bold uppercase tracking-widest"
                                    style={{ color: C.navy }}
                                >
                                    Gebouw
                                </td>
                            </tr>
                            <Row label="Bouwjaar">
                                {reports.map((r) => (
                                    <td key={r.id} className="p-3">
                                        <CellValue value={r.building?.bouwjaar} best={bestYear} lower={false} />
                                    </td>
                                ))}
                            </Row>
                            <Row label="Oppervlakte">
                                {reports.map((r) => (
                                    <td key={r.id} className="p-3">
                                        <CellValue value={r.building?.oppervlakte} suffix=" m²" best={bestSize} lower={false} />
                                    </td>
                                ))}
                            </Row>
                            <Row label="Type">
                                {reports.map((r) => (
                                    <td key={r.id} className="p-3">
                                        <CellValue value={
                                            Array.isArray(r.building?.gebruiksdoel)
                                                ? r.building.gebruiksdoel.join(', ')
                                                : r.building?.gebruiksdoel
                                        } />
                                    </td>
                                ))}
                            </Row>

                            {/* Energy */}
                            <tr>
                                <td
                                    colSpan={reports.length + 1}
                                    className="px-3 pb-1 pt-5 text-xs font-bold uppercase tracking-widest"
                                    style={{ color: C.navy }}
                                >
                                    Energie
                                </td>
                            </tr>
                            <Row label="Label">
                                {reports.map((r) => (
                                    <td key={r.id} className="p-3">
                                        <Label label={r.energy?.label} />
                                    </td>
                                ))}
                            </Row>
                            <Row label="Kosten/mnd">
                                {reports.map((r) => (
                                    <td key={r.id} className="p-3">
                                        <CellValue
                                            value={r.energy_cost?.total.cost_month}
                                            suffix="/mnd"
                                            best={bestCost}
                                            lower={true}
                                        />
                                    </td>
                                ))}
                            </Row>
                            <Row label="Gas m³/jaar">
                                {reports.map((r) => (
                                    <td key={r.id} className="p-3">
                                        <CellValue value={r.energy_cost?.gas.consumption_m3} suffix=" m³" />
                                    </td>
                                ))}
                            </Row>

                            {/* Neighborhood */}
                            <tr>
                                <td
                                    colSpan={reports.length + 1}
                                    className="px-3 pb-1 pt-5 text-xs font-bold uppercase tracking-widest"
                                    style={{ color: C.navy }}
                                >
                                    Buurt
                                </td>
                            </tr>
                            <Row label="Buurt">
                                {reports.map((r) => (
                                    <td key={r.id} className="p-3">
                                        <CellValue value={r.neighborhood?.neighborhood_name} />
                                    </td>
                                ))}
                            </Row>
                            <Row label="Inwoners">
                                {reports.map((r) => (
                                    <td key={r.id} className="p-3">
                                        <CellValue value={r.neighborhood?.population} />
                                    </td>
                                ))}
                            </Row>
                            <Row label="Gem. inkomen">
                                {reports.map((r) => (
                                    <td key={r.id} className="p-3">
                                        <CellValue
                                            value={r.neighborhood?.avg_income ? `€${Number(r.neighborhood.avg_income).toLocaleString('nl-NL')}` : null}
                                        />
                                    </td>
                                ))}
                            </Row>

                            {/* Soil */}
                            <tr>
                                <td
                                    colSpan={reports.length + 1}
                                    className="px-3 pb-1 pt-5 text-xs font-bold uppercase tracking-widest"
                                    style={{ color: C.navy }}
                                >
                                    Risico
                                </td>
                            </tr>
                            <Row label="Bodem">
                                {reports.map((r) => {
                                    const status = r.soil?.status;
                                    const color = status === 'schoon' || status === 'onderzocht' ? C.green
                                        : status === 'verontreinigd' ? C.red : C.faint;
                                    return (
                                        <td key={r.id} className="p-3">
                                            <span className="text-xs font-semibold" style={{ color }}>
                                                {status === 'schoon' ? 'Schoon' : status === 'verontreinigd' ? 'Verontreinigd' : status ?? '—'}
                                            </span>
                                        </td>
                                    );
                                })}
                            </Row>

                            {/* Nearby */}
                            <tr>
                                <td
                                    colSpan={reports.length + 1}
                                    className="px-3 pb-1 pt-5 text-xs font-bold uppercase tracking-widest"
                                    style={{ color: C.navy }}
                                >
                                    Voorzieningen
                                </td>
                            </tr>
                            {(['supermarket', 'school', 'doctor', 'station', 'park'] as const).map((key) => {
                                const labels: Record<string, string> = {
                                    supermarket: 'Supermarkt', school: 'School', doctor: 'Huisarts',
                                    station: 'Station', park: 'Park',
                                };
                                const bestDist = bestValue(reports, (r) => r.nearby?.[key]?.nearest_distance_m, true);
                                return (
                                    <Row key={key} label={labels[key]}>
                                        {reports.map((r) => {
                                            const cat = r.nearby?.[key];
                                            return (
                                                <td key={r.id} className="p-3">
                                                    {cat?.nearest_name ? (
                                                        <div>
                                                            <CellValue
                                                                value={cat.nearest_distance_m! < 1000
                                                                    ? cat.nearest_distance_m
                                                                    : cat.nearest_distance_km}
                                                                suffix={cat.nearest_distance_m! < 1000 ? 'm' : 'km'}
                                                                best={bestDist}
                                                                lower={true}
                                                            />
                                                            <p className="mt-0.5 text-[10px]" style={{ color: C.faint }}>
                                                                {cat.nearest_name}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: C.faint }}>—</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </Row>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Back link */}
                <div className="mt-6 text-center">
                    <Link
                        href="/"
                        className="text-sm font-medium"
                        style={{ color: C.navy }}
                    >
                        ← Nieuw adres zoeken
                    </Link>
                </div>
            </div>
        </div>
    );
}

Compare.layout = (page: React.ReactNode) => <HuisCheckLayout title="Vergelijk — HuisCheck">{page}</HuisCheckLayout>;

export default Compare;