import { Link } from '@inertiajs/react';
import { useState } from 'react';

import AddressMap from '@/components/address-map';
import AddressSearch from '@/components/address-search';
import { useShortlist } from '@/hooks/use-shortlist';
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
            className={`block font-semibold ${large ? 'text-xl sm:text-2xl' : 'text-base'}`}
            style={{ color: C.text, fontFamily: large ? serif : sans }}
        >
            {children ?? '—'}
        </span>
    );
}

function DataCell({ label, value, suffix = '' }: { label: string; value: string | number | null | undefined; suffix?: string }) {
    return (
        <div className="py-2.5 sm:py-3">
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
            <div className="px-4 py-3 sm:px-6 sm:py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                <h2
                    className="text-base font-bold tracking-tight sm:text-lg"
                    style={{ fontFamily: serif, color: C.navy }}
                >
                    {title}
                </h2>
            </div>
            <div className="px-4 py-4 sm:px-6 sm:py-5">
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
        <div className="rounded-md px-3 py-2.5 text-center sm:px-4 sm:py-3" style={{ backgroundColor: c.bg }}>
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
            className="inline-flex items-center rounded px-3 py-1.5 text-lg font-bold text-white sm:px-4 sm:py-2 sm:text-xl"
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

// ── Offerte Links ────────────────────────────────────────────────────────────

// ── Affiliate Links ──────────────────────────────────────────────────────────
// Replace placeholder URLs with your actual affiliate tracking links once approved.
// Offerteadviseur: sign up at offerteadviseur.nl/affiliate-worden
// Daisycon: sign up at daisycon.com, search for energy/isolatie campaigns

interface OfferteLink {
    label: string;
    url: string;
}

const OFFERTE_CONFIG: Record<string, {
    offerteadviseur: string;
    daisycon?: string;
    label_nl: string;
}> = {
    spouwmuurisolatie: {
        offerteadviseur: 'isolatie',
        daisycon: 'isolatie',
        label_nl: 'isolatie',
    },
    dakisolatie: {
        offerteadviseur: 'isolatie',
        daisycon: 'isolatie',
        label_nl: 'dakisolatie',
    },
    hr_glas: {
        offerteadviseur: 'glas',
        daisycon: 'kozijnen-en-glas',
        label_nl: 'HR++ glas',
    },
    warmtepomp: {
        offerteadviseur: 'warmtepomp',
        daisycon: 'warmtepomp',
        label_nl: 'warmtepomp',
    },
    zonnepanelen: {
        offerteadviseur: 'zonnepanelen',
        daisycon: 'zonnepanelen',
        label_nl: 'zonnepanelen',
    },
};

function buildOfferteLinks(improvementKey: string, postcode: string): OfferteLink[] {
    const config = OFFERTE_CONFIG[improvementKey];
    if (!config) return [];

    const pc = encodeURIComponent(postcode.replace(/\s/g, ''));
    const utm = `utm_source=huischeck&utm_medium=referral&utm_campaign=verduurzaming&utm_content=${improvementKey}`;
    const links: OfferteLink[] = [];

    // Primary: Offerteadviseur (50% revenue share)
    links.push({
        label: 'Offertes aanvragen',
        url: `https://www.offerteadviseur.nl/${config.offerteadviseur}/?postcode=${pc}&${utm}`,
    });

    // Secondary: Daisycon / Homedeal (when you have a campaign link, replace this URL)
    if (config.daisycon) {
        links.push({
            label: 'Vergelijk aanbieders',
            url: `https://www.homedeal.nl/offertes/${config.daisycon}/?postcode=${pc}&${utm}`,
        });
    }

    return links;
}

// ── Page ─────────────────────────────────────────────────────────────────────

function Report({ report }: ReportProps) {
    const { building, energy, energy_cost, soil, climate, neighborhood, nearby, coordinates } = report;
    const verdicts = buildVerdicts(building, energy, soil, climate);
    const shortlist = useShortlist();
    const saved = report.id ? shortlist.isSaved(report.id) : false;

    function handleSave() {
        if (!report.id) return;
        if (saved) {
            shortlist.remove(report.id);
        } else {
            shortlist.add({
                id: report.id,
                address: report.address,
                postcode: report.postcode,
                city: report.city,
                energyLabel: report.energy?.label,
                bouwjaar: report.building?.bouwjaar,
                costMonth: report.energy_cost?.total.cost_month,
                addedAt: new Date().toISOString(),
            });
        }
    }

    const [shared, setShared] = useState(false);

    function handleShare() {
        const url = `${window.location.origin}/report/${report.id}`;
        const text = `HuisCheck rapport: ${report.address}`;

        if (navigator.share) {
            navigator.share({ title: text, url }).catch(() => {});
            return;
        }

        // Clipboard fallback (works on HTTPS, fallback for HTTP)
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(url).then(() => {
                setShared(true);
                setTimeout(() => setShared(false), 2000);
            });
        } else {
            // Last resort: textarea trick
            const ta = document.createElement('textarea');
            ta.value = url;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setShared(true);
            setTimeout(() => setShared(false), 2000);
        }
    }

    return (
        <div>
            {/* Header bar with search */}
            <div style={{ backgroundColor: C.navy }}>
                <div className="mx-auto max-w-3xl px-3 py-2.5 sm:px-6 sm:py-3">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link
                            href="/"
                            className="shrink-0 text-[10px] font-bold uppercase tracking-widest sm:text-xs"
                            style={{ color: C.gold, fontFamily: sans }}
                        >
                            HuisCheck
                        </Link>
                        <div className="min-w-0 flex-1">
                            <AddressSearch
                                compact
                                placeholder="Zoek ander adres..."
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Title section */}
            <div style={{ backgroundColor: C.surface, borderBottom: `1px solid ${C.border}` }}>
                <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <Label>Adresrapportage</Label>
                            <h1
                                className="mt-1.5 text-xl font-bold tracking-tight sm:mt-2 sm:text-2xl"
                                style={{ fontFamily: serif, color: C.navy }}
                            >
                                {report.address}
                            </h1>
                            <p className="mt-1 text-xs sm:text-sm" style={{ color: C.muted }}>
                                {report.postcode} {report.city}
                                {report.age_days != null && (
                                    <span className="ml-2 sm:ml-3" style={{ color: C.faint }}>
                                        Opgehaald {report.age_days === 0 ? 'vandaag' : `${report.age_days} dag${report.age_days !== 1 ? 'en' : ''} geleden`}
                                    </span>
                                )}
                            </p>
                        </div>
                        {report.id && (
                            <div className="flex shrink-0 gap-2">
                                <button
                                    onClick={handleShare}
                                    type="button"
                                    className="rounded-md border px-3 py-2 text-xs font-semibold transition-all sm:px-4"
                                    style={{
                                        borderColor: shared ? C.green : C.border,
                                        backgroundColor: shared ? C.greenBg : C.surface,
                                        color: shared ? C.green : C.navy,
                                    }}
                                >
                                    {shared ? '✓ Gekopieerd' : 'Deel'}
                                </button>
                                <button
                                    onClick={handleSave}
                                    type="button"
                                    className="rounded-md border px-3 py-2 text-xs font-semibold transition-all sm:px-4"
                                    style={{
                                        borderColor: saved ? C.gold : C.border,
                                        backgroundColor: saved ? '#FDF8EF' : C.surface,
                                        color: saved ? '#92400E' : C.navy,
                                    }}
                                    disabled={!saved && shortlist.isFull}
                                    title={shortlist.isFull && !saved ? `Maximum ${shortlist.maxItems} adressen` : undefined}
                                >
                                    {saved ? '★ Bewaard' : '☆ Bewaar'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="mx-auto max-w-3xl space-y-4 px-3 py-5 sm:space-y-6 sm:px-6 sm:py-8">
                {/* Map */}
                {coordinates?.lat != null && coordinates?.lng != null && (
                    <AddressMap lat={coordinates.lat} lng={coordinates.lng} address={report.address} />
                )}

                {/* Verdicts */}
                {verdicts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {verdicts.map(({ label, type }, i) => {
                            const s = verdictStyle[type];
                            return (
                                <span
                                    key={i}
                                    className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs"
                                    style={{ backgroundColor: s.bg, color: s.text }}
                                >
                                    {s.icon} {label}
                                </span>
                            );
                        })}
                    </div>
                )}

                {/* Building */}
                <Section title="Gebouw" available={!!building}>
                    {building && (
                        <div className="grid grid-cols-2 gap-x-6 sm:gap-x-8">
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

                {/* Energy */}
                <Section title="Energielabel" available={!!energy}>
                    {energy && (
                        <div className="flex items-start justify-between gap-4">
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

                {/* Energy Cost Estimate */}
                <Section title="Geschatte energiekosten" available={!!energy_cost}>
                    {energy_cost && (
                        <div>
                            {/* Monthly total - hero number */}
                            <div className="mb-5 text-center sm:mb-6">
                                <Label>Geschatte maandlasten energie</Label>
                                <p
                                    className="mt-1 text-3xl font-bold sm:text-4xl"
                                    style={{ fontFamily: serif, color: C.navy }}
                                >
                                    €{energy_cost.total.cost_month}
                                    <span className="text-base font-normal" style={{ color: C.faint }}>/mnd</span>
                                </p>
                                <p className="mt-1 text-sm" style={{ color: C.muted }}>
                                    €{energy_cost.total.cost_year.toLocaleString('nl-NL')} per jaar
                                </p>
                            </div>

                            {/* Breakdown */}
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                <div className="rounded-md px-3 py-3 text-center" style={{ backgroundColor: C.bg }}>
                                    <Label>Gas</Label>
                                    <p className="mt-1 text-base font-bold" style={{ color: C.text }}>
                                        €{energy_cost.gas.cost_month}
                                    </p>
                                    <p className="text-[10px]" style={{ color: C.faint }}>
                                        {energy_cost.gas.consumption_m3} m³/jaar
                                    </p>
                                </div>
                                <div className="rounded-md px-3 py-3 text-center" style={{ backgroundColor: C.bg }}>
                                    <Label>Stroom</Label>
                                    <p className="mt-1 text-base font-bold" style={{ color: C.text }}>
                                        €{energy_cost.electricity.cost_month}
                                    </p>
                                    <p className="text-[10px]" style={{ color: C.faint }}>
                                        {energy_cost.electricity.consumption_kwh} kWh/jaar
                                    </p>
                                </div>
                                <div className="rounded-md px-3 py-3 text-center" style={{ backgroundColor: C.bg }}>
                                    <Label>Netwerk</Label>
                                    <p className="mt-1 text-base font-bold" style={{ color: C.text }}>
                                        €{energy_cost.network.cost_month}
                                    </p>
                                    <p className="text-[10px]" style={{ color: C.faint }}>
                                        vast/maand
                                    </p>
                                </div>
                            </div>

                            {/* Improvements */}
                            {energy_cost.improvements.length > 0 && (
                                <div className="mt-5 sm:mt-6">
                                    <div className="mb-3 flex items-center justify-between">
                                        <Label>Verduurzamingsadvies</Label>
                                        {energy_cost.potential_saving_year > 0 && (
                                            <span
                                                className="rounded px-2 py-0.5 text-xs font-semibold"
                                                style={{ backgroundColor: C.greenBg, color: C.green }}
                                            >
                                                Tot €{energy_cost.potential_saving_year}/jaar besparen
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        {energy_cost.improvements.map((imp) => {
                                            const links = buildOfferteLinks(imp.key, report.postcode);

                                            return (
                                                <div
                                                    key={imp.key}
                                                    className="rounded-md border px-4 py-3"
                                                    style={{ borderColor: C.border }}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-semibold" style={{ color: C.text }}>
                                                                {imp.label}
                                                            </p>
                                                            <p className="mt-0.5 text-xs" style={{ color: C.muted }}>
                                                                {imp.description}
                                                            </p>
                                                        </div>
                                                        <div className="shrink-0 text-right">
                                                            <p className="text-sm font-bold" style={{ color: C.green }}>
                                                                -€{imp.saving_month}/mnd
                                                            </p>
                                                            <p className="text-[10px]" style={{ color: C.faint }}>
                                                                terugverdientijd {imp.payback_years} jaar
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                                        <div className="flex gap-3">
                                                            <span className="text-[10px]" style={{ color: C.faint }}>
                                                                Investering: €{imp.cost_min.toLocaleString('nl-NL')} – €{imp.cost_max.toLocaleString('nl-NL')}
                                                            </span>
                                                            <span className="text-[10px]" style={{ color: C.faint }}>
                                                                Besparing: €{imp.saving_year}/jaar
                                                            </span>
                                                        </div>
                                                        {links.length > 0 && (
                                                            <div className="flex gap-1.5">
                                                                {links.map((link, i) => (
                                                                    <a
                                                                        key={i}
                                                                        href={link.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold transition-opacity hover:opacity-80"
                                                                        style={{
                                                                            backgroundColor: i === 0 ? C.navy : 'transparent',
                                                                            color: i === 0 ? '#FFFFFF' : C.navy,
                                                                            border: i === 0 ? 'none' : `1px solid ${C.border}`,
                                                                        }}
                                                                    >
                                                                        {link.label}
                                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                                            <polyline points="15 3 21 3 21 9" />
                                                                            <line x1="10" y1="14" x2="21" y2="3" />
                                                                        </svg>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Disclaimer */}
                            <p className="mt-4 text-[10px] leading-relaxed" style={{ color: C.faint }}>
                                {energy_cost.note}
                            </p>
                        </div>
                    )}
                </Section>

                {/* Neighborhood Stats */}
                <Section title="Buurtstatistieken" available={!!neighborhood?.neighborhood_name}>
                    {neighborhood && (
                        <div>
                            <p className="mb-3 text-sm sm:mb-4" style={{ color: C.muted }}>
                                <span className="font-semibold" style={{ color: C.text }}>{neighborhood.neighborhood_name}</span>
                                {neighborhood.municipality && `, ${neighborhood.municipality}`}
                            </p>

                            <div className="grid grid-cols-2 gap-x-6 sm:gap-x-8">
                                <DataCell label="Inwoners" value={neighborhood.population} />
                                <DataCell label="Dichtheid" value={neighborhood.population_density} suffix="/km²" />
                                <DataCell label="Huishoudens" value={neighborhood.households} />
                                <DataCell label="Huishoudgrootte" value={neighborhood.avg_household_size} />
                                {neighborhood.avg_income && (
                                    <DataCell
                                        label="Gem. inkomen"
                                        value={`€${Number(neighborhood.avg_income).toLocaleString('nl-NL')}`}
                                    />
                                )}
                                {neighborhood.avg_property_value && (
                                    <DataCell
                                        label="Gem. WOZ-waarde"
                                        value={`€${Number(neighborhood.avg_property_value).toLocaleString('nl-NL')}`}
                                    />
                                )}
                                {neighborhood.cars_per_household && (
                                    <DataCell label="Auto's per huishouden" value={neighborhood.cars_per_household} />
                                )}
                            </div>

                            {neighborhood.pct_0_14 != null && (
                                <div className="mt-5 sm:mt-6">
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
                                    <div className="mt-2 flex flex-wrap gap-3 sm:gap-4">
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

                {/* Nearby Amenities */}
                <Section title="In de buurt" available={!!nearby}>
                    {nearby && (
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                            {([
                                { key: 'supermarket' as const, icon: '🛒', label: 'Supermarkt' },
                                { key: 'school' as const, icon: '🏫', label: 'Basisschool' },
                                { key: 'doctor' as const, icon: '🏥', label: 'Huisarts' },
                                { key: 'park' as const, icon: '🌳', label: 'Park' },
                                { key: 'station' as const, icon: '🚉', label: 'Station' },
                                { key: 'pharmacy' as const, icon: '💊', label: 'Apotheek' },
                                { key: 'restaurant' as const, icon: '🍽️', label: 'Restaurant' },
                                { key: 'childcare' as const, icon: '👶', label: 'Kinderopvang' },
                            ]).map(({ key, icon, label }) => {
                                const cat = nearby[key];
                                if (!cat?.nearest_name) return null;

                                return (
                                    <div
                                        key={key}
                                        className="flex items-center gap-3 rounded-md px-3 py-2.5 sm:px-4 sm:py-3"
                                        style={{ backgroundColor: C.bg }}
                                    >
                                        <span className="shrink-0 text-lg">{icon}</span>
                                        <div className="min-w-0 flex-1">
                                            <Label>{label}</Label>
                                            <p className="mt-0.5 text-sm font-semibold leading-tight" style={{ color: C.text }}>
                                                {cat.nearest_name}
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <span className="text-sm font-semibold" style={{ color: C.text }}>
                                                {cat.nearest_distance_m! < 1000
                                                    ? `${cat.nearest_distance_m}m`
                                                    : `${cat.nearest_distance_km}km`}
                                            </span>
                                            {cat.count > 1 && (
                                                <p className="text-[10px]" style={{ color: C.faint }}>
                                                    {cat.count} in buurt
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Section>

                {/* Soil */}
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

                {/* Climate */}
                <Section title="Klimaatrisico" available={!!climate}>
                    {climate && (
                        <div>
                            {climate.viewer_url ? (
                                <div className="rounded-md px-4 py-4 text-center" style={{ backgroundColor: C.bg }}>
                                    <p className="mb-3 text-sm" style={{ color: C.muted }}>
                                        {climate.message ?? 'Bekijk de Klimaateffectatlas voor risico-informatie.'}
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
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                                    <RiskIndicator level={climate.flood_risk?.risk_level ?? 'onbekend'} label="Wateroverlast" />
                                    <RiskIndicator level={climate.heat_stress?.risk_level ?? 'onbekend'} label="Hittestress" />
                                    <RiskIndicator level={climate.subsidence?.risk_level ?? 'onbekend'} label="Bodemdaling" />
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