import { Link } from '@inertiajs/react';

import AddressMap from '@/components/address-map';
import AddressSearch from '@/components/address-search';
import HuisCheckLayout from '@/layouts/huischeck-layout';
import type { AddressReport, BagData, ClimateData, EnergyData, RiskLevel, SoilData } from '@/types/huischeck';

// ── Design tokens ────────────────────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────────────

interface ReportProps {
    report: AddressReport;
}

function Label({ children }: { children: React.ReactNode }) {
    return (
        <span
            className="block text-xs font-semibold uppercase tracking-widest"
            style={{ color: C.faint, fontFamily: sans, fontSize: '10px', letterSpacing: '0.08em' }}
        >
            {children}
        </span>
    );
}

function Value({ children, large }: { children: React.ReactNode; large?: boolean }) {
    return (
        <span
            className={`block font-semibold ${large ? 'text-2xl' : 'text-base'}`}
            style={{ color: C.text, fontFamily: large ? serif : sans }}
        >
            {children ?? '—'}
        </span>
    );
}

function DataCell({ label, value, suffix = '' }: { label: string; value: string | number | null | undefined; suffix?: string }) {
    return (
        <div className="py-3">
            <Label>{label}</Label>
            <Value>{value != null ? `${value}${suffix}` : null}</Value>
        </div>
    );
}

function Section({ title, children, available = true }: { title: string; children: React.ReactNode; available?: boolean }) {
    return (
        <div
            className="overflow-hidden rounded-lg border"
            style={{ backgroundColor: C.surface, borderColor: C.border }}
        >
            <div className="px-6 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                <h2
                    className="text-lg font-bold tracking-tight"
                    style={{ fontFamily: serif, color: C.navy }}
                >
                    {title}
                </h2>
            </div>
            <div className="px-6 py-5">
                {available ? children : (
                    <p className="text-sm italic" style={{ color: C.faint }}>
                        Geen gegevens beschikbaar voor dit adres.
                    </p>
                )}
            </div>
        </div>
    );
}

function RiskIndicator({ level, label }: { level: RiskLevel; label?: string }) {
    const config: Record<RiskLevel, { bg: string; text: string; display: string }> = {
        laag: { bg: C.greenBg, text: C.green, display: 'Laag' },
        gemiddeld: { bg: C.amberBg, text: C.amber, display: 'Gemiddeld' },
        hoog: { bg: C.redBg, text: C.red, display: 'Hoog' },
        zeer_hoog: { bg: C.redBg, text: C.red, display: 'Zeer hoog' },
        onbekend: { bg: C.bg, text: C.faint, display: 'Onbekend' },
    };
    const c = config[level] ?? config.onbekend;

    return (
        <div className="rounded-md px-4 py-3 text-center" style={{ backgroundColor: c.bg }}>
            {label && <Label>{label}</Label>}
            <span className="mt-1 block text-sm font-bold" style={{ color: c.text }}>
                {c.display}
            </span>
        </div>
    );
}

function EnergyBadge({ label }: { label: string | null }) {
    if (!label) return <span className="text-sm" style={{ color: C.faint }}>Niet beschikbaar</span>;

    const colors: Record<string, string> = {
        'A+++++': '#065F46', 'A++++': '#047857', 'A+++': '#059669',
        'A++': '#10B981', 'A+': '#10B981', A: '#059669',
        B: '#84CC16', C: '#EAB308', D: '#F59E0B',
        E: '#F97316', F: '#EF4444', G: '#DC2626',
    };

    return (
        <span
            className="inline-flex items-center rounded px-4 py-2 text-xl font-bold text-white"
            style={{ backgroundColor: colors[label] ?? C.faint, fontFamily: sans }}
        >
            {label}
        </span>
    );
}

// ── Verdicts ─────────────────────────────────────────────────────────────────

function buildVerdicts(b: BagData | null, e: EnergyData | null, s: SoilData | null, c: ClimateData | null) {
    const items: { label: string; type: 'positive' | 'neutral' | 'negative' }[] = [];

    if (b?.bouwjaar) {
        const age = new Date().getFullYear() - b.bouwjaar;
        if (age < 10) items.push({ label: 'Nieuwbouw', type: 'positive' });
        else if (age < 30) items.push({ label: 'Modern gebouw', type: 'positive' });
        else if (age < 60) items.push({ label: 'Gedateerd gebouw', type: 'neutral' });
        else items.push({ label: 'Oud gebouw (60+ jaar)', type: 'negative' });
    }

    if (e?.label) {
        const good = ['A+++++', 'A++++', 'A+++', 'A++', 'A+', 'A', 'B'];
        if (good.includes(e.label)) items.push({ label: `Energielabel ${e.label}`, type: 'positive' });
        else if (['C', 'D'].includes(e.label)) items.push({ label: `Energielabel ${e.label}`, type: 'neutral' });
        else items.push({ label: `Energielabel ${e.label}`, type: 'negative' });
    }

    if (s?.status === 'onderzocht' || s?.status === 'schoon') items.push({ label: 'Bodem schoon', type: 'positive' });
    else if (s?.status === 'verontreinigd') items.push({ label: 'Bodemverontreiniging aanwezig', type: 'negative' });

    if (c?.overall_risk === 'laag') items.push({ label: 'Laag klimaatrisico', type: 'positive' });
    else if (c?.overall_risk === 'gemiddeld') items.push({ label: 'Gemiddeld klimaatrisico', type: 'neutral' });
    else if (c?.overall_risk === 'hoog' || c?.overall_risk === 'zeer_hoog') items.push({ label: 'Hoog klimaatrisico', type: 'negative' });

    return items;
}

const verdictStyle = {
    positive: { bg: C.greenBg, text: C.green, icon: '✓' },
    neutral: { bg: C.amberBg, text: C.amber, icon: '–' },
    negative: { bg: C.redBg, text: C.red, icon: '✕' },
};

// ── Age Distribution ─────────────────────────────────────────────────────────

const AGE_GROUPS = [
    { key: 'pct_0_14' as const, color: '#93C5FD', label: '0–14' },
    { key: 'pct_15_24' as const, color: '#6EE7B7', label: '15–24' },
    { key: 'pct_25_44' as const, color: '#FCD34D', label: '25–44' },
    { key: 'pct_45_64' as const, color: '#FDBA74', label: '45–64' },
    { key: 'pct_65_plus' as const, color: '#FCA5A5', label: '65+' },
] as const;

// ── Page ─────────────────────────────────────────────────────────────────────

function Report({ report }: ReportProps) {
    const { building, energy, soil, climate, neighborhood, coordinates } = report;
    const verdicts = buildVerdicts(building, energy, soil, climate);

    return (
        <div>
            {/* Header bar with search */}
            <div style={{ backgroundColor: C.navy }}>
                <div className="mx-auto max-w-3xl px-6 py-3">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="shrink-0 text-xs font-bold uppercase tracking-widest"
                            style={{ color: C.gold, fontFamily: sans }}
                        >
                            HuisCheck
                        </Link>
                        <div className="flex-1">
                            <AddressSearch
                                compact
                                placeholder="Zoek een ander adres..."
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Title section */}
            <div style={{ backgroundColor: C.surface, borderBottom: `1px solid ${C.border}` }}>
                <div className="mx-auto max-w-3xl px-6 py-8">
                    <Label>Adresrapportage</Label>
                    <h1
                        className="mt-2 text-2xl font-bold tracking-tight"
                        style={{ fontFamily: serif, color: C.navy }}
                    >
                        {report.address}
                    </h1>
                    <p className="mt-1 text-sm" style={{ color: C.muted }}>
                        {report.postcode} {report.city}
                        {report.age_days != null && (
                            <span className="ml-3" style={{ color: C.faint }}>
                                Opgehaald {report.age_days === 0 ? 'vandaag' : `${report.age_days} dag${report.age_days !== 1 ? 'en' : ''} geleden`}
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
                {coordinates?.lat != null && coordinates?.lng != null && (
                    <AddressMap lat={coordinates.lat} lng={coordinates.lng} address={report.address} />
                )}

                {verdicts.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {verdicts.map(({ label, type }, i) => {
                            const s = verdictStyle[type];
                            return (
                                <span
                                    key={i}
                                    className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold"
                                    style={{ backgroundColor: s.bg, color: s.text }}
                                >
                                    {s.icon} {label}
                                </span>
                            );
                        })}
                    </div>
                )}

                <Section title="Gebouw" available={!!building}>
                    {building && (
                        <div className="grid grid-cols-2 gap-x-8">
                            <DataCell label="Bouwjaar" value={building.bouwjaar} />
                            <DataCell label="Oppervlakte" value={building.oppervlakte} suffix=" m²" />
                            <DataCell label="Status" value={building.status} />
                            <DataCell
                                label="Gebruiksdoel"
                                value={Array.isArray(building.gebruiksdoel) ? building.gebruiksdoel.join(', ') : building.gebruiksdoel}
                            />
                        </div>
                    )}
                </Section>

                <Section title="Energielabel" available={!!energy}>
                    {energy && (
                        <div className="flex items-start justify-between">
                            <div>
                                <EnergyBadge label={energy.label} />
                                {energy.registration_date && (
                                    <p className="mt-2 text-xs" style={{ color: C.faint }}>
                                        Geregistreerd {energy.registration_date}
                                    </p>
                                )}
                                {energy.is_definitive === false && (
                                    <p className="mt-1 text-xs font-medium" style={{ color: C.amber }}>
                                        Voorlopig label
                                    </p>
                                )}
                            </div>
                            {energy.energy_index != null && (
                                <div className="text-right">
                                    <Label>Energie-index</Label>
                                    <Value large>{energy.energy_index}</Value>
                                </div>
                            )}
                        </div>
                    )}
                </Section>

                <Section title="Bodemkwaliteit" available={soil?.has_data !== false}>
                    {soil && (
                        <div>
                            <RiskIndicator
                                level={
                                    soil.status === 'verontreinigd' ? 'hoog'
                                    : soil.status === 'onderzocht' || soil.status === 'schoon' ? 'laag'
                                    : 'onbekend'
                                }
                                label="Status"
                            />
                            {soil.message && (
                                <p className="mt-3 text-sm" style={{ color: C.muted }}>{soil.message}</p>
                            )}
                            {soil.investigations?.length > 0 && (
                                <div className="mt-4">
                                    <Label>Uitgevoerde onderzoeken ({soil.investigations.length})</Label>
                                    <div className="mt-2 space-y-1.5">
                                        {soil.investigations.map((inv, i) => (
                                            <div
                                                key={i}
                                                className="rounded px-3 py-2 text-sm"
                                                style={{ backgroundColor: C.bg, color: C.text }}
                                            >
                                                <span className="font-semibold">{inv.type}</span>
                                                {inv.description && <span style={{ color: C.muted }}> — {inv.description}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Section>

                <Section title="Klimaatrisico" available={!!climate}>
                    {climate && (
                        <div>
                            {climate.viewer_url ? (
                                <div className="rounded-md px-4 py-4 text-center" style={{ backgroundColor: C.bg }}>
                                    <p className="mb-3 text-sm" style={{ color: C.muted }}>
                                        {climate.message ?? 'Bekijk de Klimaateffectatlas voor risico-informatie over wateroverlast, hittestress en bodemdaling.'}
                                    </p>
                                    <a
                                        href={climate.viewer_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                                        style={{ backgroundColor: C.navy }}
                                    >
                                        Open Klimaateffectatlas
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                            <polyline points="15 3 21 3 21 9" />
                                            <line x1="10" y1="14" x2="21" y2="3" />
                                        </svg>
                                    </a>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-3">
                                    <RiskIndicator level={climate.flood_risk?.risk_level ?? 'onbekend'} label="Wateroverlast" />
                                    <RiskIndicator level={climate.heat_stress?.risk_level ?? 'onbekend'} label="Hittestress" />
                                    <RiskIndicator level={climate.subsidence?.risk_level ?? 'onbekend'} label="Bodemdaling" />
                                </div>
                            )}
                        </div>
                    )}
                </Section>

                <Section title="Buurtstatistieken" available={!!neighborhood?.neighborhood_name}>
                    {neighborhood && (
                        <div>
                            <p className="mb-4 text-sm" style={{ color: C.muted }}>
                                <span className="font-semibold" style={{ color: C.text }}>{neighborhood.neighborhood_name}</span>
                                {neighborhood.municipality && `, ${neighborhood.municipality}`}
                            </p>

                            <div className="grid grid-cols-2 gap-x-8">
                                <DataCell label="Inwoners" value={neighborhood.population} />
                                <DataCell label="Dichtheid" value={neighborhood.population_density} suffix="/km²" />
                                <DataCell
                                    label="Gem. inkomen"
                                    value={neighborhood.avg_income ? `€${Number(neighborhood.avg_income).toLocaleString('nl-NL')}` : null}
                                />
                                <DataCell
                                    label="Gem. WOZ-waarde"
                                    value={neighborhood.avg_property_value ? `€${Number(neighborhood.avg_property_value).toLocaleString('nl-NL')}` : null}
                                />
                                <DataCell label="Huishoudgrootte" value={neighborhood.avg_household_size} />
                                <DataCell label="Afstand supermarkt" value={neighborhood.distance_supermarket} suffix=" km" />
                                <DataCell label="Afstand school" value={neighborhood.distance_school} suffix=" km" />
                                <DataCell label="Afstand huisarts" value={neighborhood.distance_gp} suffix=" km" />
                            </div>

                            {neighborhood.pct_0_14 != null && (
                                <div className="mt-6">
                                    <Label>Leeftijdsverdeling</Label>
                                    <div className="mt-2 flex h-6 gap-px overflow-hidden rounded">
                                        {AGE_GROUPS.map(({ key, color, label }) => {
                                            const val = neighborhood[key];
                                            if (!val || val <= 0) return null;
                                            return (
                                                <div
                                                    key={key}
                                                    className="relative"
                                                    style={{ width: `${val}%`, backgroundColor: color }}
                                                    title={`${label}: ${val}%`}
                                                >
                                                    {val > 10 && (
                                                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow-sm">
                                                            {val}%
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-2 flex gap-4">
                                        {AGE_GROUPS.map(({ key, color, label }) => (
                                            <div key={key} className="flex items-center gap-1">
                                                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
                                                <span className="text-[10px]" style={{ color: C.faint }}>{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Section>
            </div>
        </div>
    );
}

Report.layout = (page: React.ReactNode) => <HuisCheckLayout title="Adresrapportage — HuisCheck">{page}</HuisCheckLayout>;

export default Report;