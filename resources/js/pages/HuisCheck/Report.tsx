import { Link } from '@inertiajs/react';
import { useState } from 'react';

import AddressMap from '@/components/address-map';
import AddressSearch from '@/components/address-search';
import { useShortlist } from '@/hooks/use-shortlist';
import HuisCheckLayout from '@/layouts/huischeck-layout';
import type { AddressReport, BagData, ClimateData, EnergyData, RiskLevel, SoilData } from '@/types/huischeck';

const C = {
    navy: '#0B1D3A', gold: '#D4A853', text: '#1A1A1A', muted: '#6B6560',
    faint: '#9C9689', border: '#E5E2DB', surface: '#FFFFFF', bg: '#F7F6F3',
    green: '#2D6A4F', greenBg: '#F0F7F2', amber: '#92400E', amberBg: '#FFFBEB',
    red: '#991B1B', redBg: '#FEF2F2',
} as const;

const serif = "'Libre Baskerville', serif";
const sans = "'Source Sans 3', sans-serif";

interface ReportProps { report: AddressReport; }

function Label({ children }: { children: React.ReactNode }) {
    return <span className="block text-xs font-semibold uppercase tracking-widest" style={{ color: C.faint, fontFamily: sans, fontSize: '10px', letterSpacing: '0.08em' }}>{children}</span>;
}

function Value({ children, large }: { children: React.ReactNode; large?: boolean }) {
    return <span className={`block font-semibold ${large ? 'text-xl sm:text-2xl' : 'text-base'}`} style={{ color: C.text, fontFamily: large ? serif : sans }}>{children ?? '—'}</span>;
}

function DataCell({ label, value, suffix = '' }: { label: string; value: string | number | null | undefined; suffix?: string }) {
    return <div className="py-2.5 sm:py-3"><Label>{label}</Label><Value>{value != null ? `${value}${suffix}` : null}</Value></div>;
}

function Section({ title, children, available = true }: { title: string; children: React.ReactNode; available?: boolean }) {
    return (
        <div className="overflow-hidden rounded-lg border" style={{ backgroundColor: C.surface, borderColor: C.border }}>
            <div className="px-4 py-3 sm:px-6 sm:py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                <h2 className="text-base font-bold tracking-tight sm:text-lg" style={{ fontFamily: serif, color: C.navy }}>{title}</h2>
            </div>
            <div className="px-4 py-4 sm:px-6 sm:py-5">
                {available ? children : <p className="text-sm italic" style={{ color: C.faint }}>Geen gegevens beschikbaar voor dit adres.</p>}
            </div>
        </div>
    );
}

function RiskIndicator({ level, label }: { level: RiskLevel; label?: string }) {
    const config: Record<RiskLevel, { bg: string; text: string; display: string }> = {
        laag: { bg: C.greenBg, text: C.green, display: 'Laag' }, gemiddeld: { bg: C.amberBg, text: C.amber, display: 'Gemiddeld' },
        hoog: { bg: C.redBg, text: C.red, display: 'Hoog' }, zeer_hoog: { bg: C.redBg, text: C.red, display: 'Zeer hoog' },
        onbekend: { bg: C.bg, text: C.faint, display: 'Onbekend' },
    };
    const c = config[level] ?? config.onbekend;
    return <div className="rounded-md px-3 py-2.5 text-center sm:px-4 sm:py-3" style={{ backgroundColor: c.bg }}>{label && <Label>{label}</Label>}<span className="mt-1 block text-sm font-bold" style={{ color: c.text }}>{c.display}</span></div>;
}

function EnergyBadge({ label }: { label: string | null }) {
    if (!label) return <span className="text-sm" style={{ color: C.faint }}>Niet beschikbaar</span>;
    const colors: Record<string, string> = { 'A+++++': '#065F46', 'A++++': '#047857', 'A+++': '#059669', 'A++': '#10B981', 'A+': '#10B981', A: '#059669', B: '#84CC16', C: '#EAB308', D: '#F59E0B', E: '#F97316', F: '#EF4444', G: '#DC2626' };
    return <span className="inline-flex items-center rounded px-3 py-1.5 text-lg font-bold text-white sm:px-4 sm:py-2 sm:text-xl" style={{ backgroundColor: colors[label] ?? C.faint, fontFamily: sans }}>{label}</span>;
}

function ExternalIcon({ size = 12 }: { size?: number }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>;
}

function buildVerdicts(b: BagData | null, e: EnergyData | null, s: SoilData | null, c: ClimateData | null) {
    const items: { label: string; type: 'positive' | 'neutral' | 'negative' }[] = [];
    if (b?.bouwjaar) { const age = new Date().getFullYear() - b.bouwjaar; if (age < 10) items.push({ label: 'Nieuwbouw', type: 'positive' }); else if (age < 30) items.push({ label: 'Modern gebouw', type: 'positive' }); else if (age < 60) items.push({ label: 'Gedateerd gebouw', type: 'neutral' }); else items.push({ label: 'Oud gebouw (60+ jaar)', type: 'negative' }); }
    if (e?.label) { const good = ['A+++++', 'A++++', 'A+++', 'A++', 'A+', 'A', 'B']; if (good.includes(e.label)) items.push({ label: `Energielabel ${e.label}`, type: 'positive' }); else if (['C', 'D'].includes(e.label)) items.push({ label: `Energielabel ${e.label}`, type: 'neutral' }); else items.push({ label: `Energielabel ${e.label}`, type: 'negative' }); }
    if (s?.status === 'onderzocht' || s?.status === 'schoon') items.push({ label: 'Bodem schoon', type: 'positive' }); else if (s?.status === 'verontreinigd') items.push({ label: 'Bodemverontreiniging', type: 'negative' });
    return items;
}

const verdictStyle = { positive: { bg: C.greenBg, text: C.green, icon: '✓' }, neutral: { bg: C.amberBg, text: C.amber, icon: '–' }, negative: { bg: C.redBg, text: C.red, icon: '✕' } };

const AGE_GROUPS = [
    { key: 'pct_0_14' as const, color: '#93C5FD', label: '0–14' }, { key: 'pct_15_24' as const, color: '#6EE7B7', label: '15–24' },
    { key: 'pct_25_44' as const, color: '#FCD34D', label: '25–44' }, { key: 'pct_45_64' as const, color: '#FDBA74', label: '45–64' },
    { key: 'pct_65_plus' as const, color: '#FCA5A5', label: '65+' },
] as const;

const OFFERTE_LABELS: Record<string, string> = {
    spouwmuurisolatie: 'spouwmuurisolatie', dakisolatie: 'dakisolatie',
    hr_glas: 'HR++ beglazing', warmtepomp: 'warmtepomp', zonnepanelen: 'zonnepanelen',
};

const OFFERTE_CATS: Record<string, string> = {
    spouwmuurisolatie: 'isolatie', dakisolatie: 'isolatie',
    hr_glas: 'glas', warmtepomp: 'warmtepomp', zonnepanelen: 'zonnepanelen',
};

function buildOfferteUrl(key: string, postcode: string): string | null {
    const cat = OFFERTE_CATS[key];
    if (!cat) return null;
    const pc = encodeURIComponent(postcode.replace(/\s/g, ''));
    return `https://www.offerteadviseur.nl/${cat}/?postcode=${pc}&utm_source=huischeck&utm_medium=referral&utm_campaign=verduurzaming&utm_content=${key}`;
}

// ── Page ─────────────────────────────────────────────────────────────────────

function Report({ report }: ReportProps) {
    const { building, energy, energy_cost, soil, climate, neighborhood, nearby, analyse, coordinates } = report;
    const verdicts = buildVerdicts(building, energy, soil, climate);
    const shortlist = useShortlist();
    const saved = report.id ? shortlist.isSaved(report.id) : false;
    const [shared, setShared] = useState(false);

    const hasImprovements = (energy_cost?.improvements?.length ?? 0) > 0;
    const totalSaving = energy_cost?.potential_saving_year ?? 0;

    function handleSave() {
        if (!report.id) return;
        if (saved) { shortlist.remove(report.id); } else {
            shortlist.add({ id: report.id, address: report.address, postcode: report.postcode, city: report.city, energyLabel: report.energy?.label, bouwjaar: report.building?.bouwjaar, costMonth: report.energy_cost?.total.cost_month, addedAt: new Date().toISOString() });
        }
    }

    function handleShare() {
        const url = `${window.location.origin}/report/${report.id}`;
        if (navigator.share) { navigator.share({ title: `HuisCheck: ${report.address}`, url }).catch(() => {}); return; }
        if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(url).then(() => { setShared(true); setTimeout(() => setShared(false), 2000); }); }
        else { const ta = document.createElement('textarea'); ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); setShared(true); setTimeout(() => setShared(false), 2000); }
    }

    return (
        <div>
            {/* Header */}
            <div style={{ backgroundColor: C.navy }}>
                <div className="mx-auto max-w-3xl px-3 py-2.5 sm:px-6 sm:py-3">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link href="/" className="shrink-0 text-[10px] font-bold uppercase tracking-widest sm:text-xs" style={{ color: C.gold, fontFamily: sans }}>HuisCheck</Link>
                        <div className="min-w-0 flex-1"><AddressSearch compact placeholder="Zoek ander adres..." /></div>
                    </div>
                </div>
            </div>

            {/* Title */}
            <div style={{ backgroundColor: C.surface, borderBottom: `1px solid ${C.border}` }}>
                <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <Label>Adresrapportage</Label>
                            <h1 className="mt-1.5 text-xl font-bold tracking-tight sm:mt-2 sm:text-2xl" style={{ fontFamily: serif, color: C.navy }}>{report.address}</h1>
                            <p className="mt-1 text-xs sm:text-sm" style={{ color: C.muted }}>
                                {report.postcode} {report.city}
                                {report.age_days != null && <span className="ml-2 sm:ml-3" style={{ color: C.faint }}>Opgehaald {report.age_days === 0 ? 'vandaag' : `${report.age_days} dag${report.age_days !== 1 ? 'en' : ''} geleden`}</span>}
                            </p>
                        </div>
                        {report.id && (
                            <div className="flex shrink-0 gap-2">
                                <button onClick={handleShare} type="button" className="rounded-md border px-3 py-2 text-xs font-semibold transition-all sm:px-4" style={{ borderColor: shared ? C.green : C.border, backgroundColor: shared ? C.greenBg : C.surface, color: shared ? C.green : C.navy }}>{shared ? '✓ Gekopieerd' : '↗ Deel'}</button>
                                <button onClick={handleSave} type="button" className="rounded-md border px-3 py-2 text-xs font-semibold transition-all sm:px-4" style={{ borderColor: saved ? C.gold : C.border, backgroundColor: saved ? '#FDF8EF' : C.surface, color: saved ? '#92400E' : C.navy }} disabled={!saved && shortlist.isFull}>{saved ? '★ Bewaard' : '☆ Bewaar'}</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="mx-auto max-w-3xl space-y-4 px-3 py-5 sm:space-y-6 sm:px-6 sm:py-8">

                {coordinates?.lat != null && coordinates?.lng != null && <AddressMap lat={coordinates.lat} lng={coordinates.lng} address={report.address} />}

                {verdicts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {verdicts.map(({ label, type }, i) => { const s = verdictStyle[type]; return <span key={i} className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs" style={{ backgroundColor: s.bg, color: s.text }}>{s.icon} {label}</span>; })}
                    </div>
                )}

                {/* ═══ WONINGANALYSE ═══ */}
                {analyse && (
                    <div className="overflow-hidden rounded-lg border" style={{ backgroundColor: C.surface, borderColor: C.border }}>
                        <div className="px-4 py-4 sm:px-6 sm:py-5" style={{ backgroundImage: 'linear-gradient(135deg, #0B1D3A 0%, #162D52 100%)' }}>
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.gold }}>Woninganalyse</p>
                                    <h2 className="mt-1 text-lg font-bold tracking-tight text-white sm:text-xl" style={{ fontFamily: serif }}>{analyse.verdict.title}</h2>
                                    <p className="mt-1 text-xs leading-relaxed sm:text-sm" style={{ color: '#A0AEC0' }}>{analyse.verdict.summary}</p>
                                </div>
                                <div className="shrink-0 text-center">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] sm:h-20 sm:w-20" style={{ borderColor: analyse.score >= 65 ? '#48BB78' : analyse.score >= 40 ? C.gold : '#FC8181', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                        <span className="text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: sans }}>{analyse.score}</span>
                                    </div>
                                    <p className="mt-1 text-[10px] font-medium" style={{ color: '#A0AEC0' }}>van 100</p>
                                </div>
                            </div>
                        </div>
                        <div className="px-4 py-4 sm:px-6 sm:py-5">
                            {analyse.strengths.length > 0 && (
                                <div className="mb-5">
                                    <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: C.green }}>
                                        <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-white" style={{ backgroundColor: C.green }}>✓</span> Sterke punten
                                    </p>
                                    <div className="space-y-2">{analyse.strengths.map((item, i) => <div key={i} className="rounded-md px-3.5 py-2.5" style={{ backgroundColor: C.greenBg }}><p className="text-sm font-semibold" style={{ color: C.green }}>{item.title}</p><p className="mt-0.5 text-xs leading-relaxed" style={{ color: C.muted }}>{item.detail}</p></div>)}</div>
                                </div>
                            )}
                            {analyse.risks.length > 0 && (
                                <div className="mb-5">
                                    <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: C.red }}>
                                        <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-white" style={{ backgroundColor: C.red }}>!</span> Aandachtspunten
                                    </p>
                                    <div className="space-y-2">{analyse.risks.map((item, i) => <div key={i} className="rounded-md px-3.5 py-2.5" style={{ backgroundColor: C.redBg }}><p className="text-sm font-semibold" style={{ color: C.red }}>{item.title}</p><p className="mt-0.5 text-xs leading-relaxed" style={{ color: C.muted }}>{item.detail}</p></div>)}</div>
                                </div>
                            )}
                            {analyse.let_op.length > 0 && (
                                <div className="rounded-md px-4 py-3.5" style={{ backgroundColor: C.amberBg, borderLeft: `3px solid ${C.gold}` }}>
                                    <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: C.amber }}>Advies bij bod</p>
                                    <ul className="space-y-1.5">{analyse.let_op.map((text, i) => <li key={i} className="flex gap-2 text-xs leading-relaxed" style={{ color: C.muted }}><span className="mt-0.5 shrink-0" style={{ color: C.amber }}>→</span>{text}</li>)}</ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ═══ GEBOUW ═══ */}
                <Section title="Gebouw" available={!!building}>
                    {building && <div className="grid grid-cols-2 gap-x-6 sm:gap-x-8"><DataCell label="Bouwjaar" value={building.bouwjaar} /><DataCell label="Oppervlakte" value={building.oppervlakte} suffix=" m²" /><DataCell label="Status" value={building.status} /><DataCell label="Gebruiksdoel" value={Array.isArray(building.gebruiksdoel) ? building.gebruiksdoel.join(', ') : building.gebruiksdoel} /></div>}
                </Section>

                {/* ═══ ENERGIE (combined label + costs + verduurzaming) ═══ */}
                <div className="overflow-hidden rounded-lg border" style={{ backgroundColor: C.surface, borderColor: C.border }}>
                    <div className="px-4 py-3 sm:px-6 sm:py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                        <h2 className="text-base font-bold tracking-tight sm:text-lg" style={{ fontFamily: serif, color: C.navy }}>Energie</h2>
                    </div>
                    <div className="px-4 py-4 sm:px-6 sm:py-5">
                        {energy ? (
                            <div>
                                {/* Label + monthly cost */}
                                <div className="flex items-center justify-between gap-4 pb-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                                    <div>
                                        <Label>Energielabel</Label>
                                        <div className="mt-1.5"><EnergyBadge label={energy.label} /></div>
                                        {energy.registration_date && <p className="mt-1.5 text-[10px]" style={{ color: C.faint }}>Geregistreerd {energy.registration_date}</p>}
                                    </div>
                                    {energy_cost && (
                                        <div className="text-right">
                                            <Label>Geschatte maandlasten</Label>
                                            <p className="mt-1 text-2xl font-bold sm:text-3xl" style={{ fontFamily: serif, color: C.navy }}>€{energy_cost.total.cost_month}</p>
                                            <p className="text-[10px]" style={{ color: C.faint }}>€{energy_cost.total.cost_year.toLocaleString('nl-NL')}/jaar</p>
                                        </div>
                                    )}
                                </div>

                                {/* Breakdown */}
                                {energy_cost && (
                                    <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                                        <div className="rounded-md px-3 py-2.5 text-center" style={{ backgroundColor: C.bg }}><Label>Gas</Label><p className="mt-1 text-sm font-bold" style={{ color: C.text }}>€{energy_cost.gas.cost_month}/mnd</p><p className="text-[10px]" style={{ color: C.faint }}>{energy_cost.gas.consumption_m3} m³/jr</p></div>
                                        <div className="rounded-md px-3 py-2.5 text-center" style={{ backgroundColor: C.bg }}><Label>Stroom</Label><p className="mt-1 text-sm font-bold" style={{ color: C.text }}>€{energy_cost.electricity.cost_month}/mnd</p><p className="text-[10px]" style={{ color: C.faint }}>{energy_cost.electricity.consumption_kwh} kWh/jr</p></div>
                                        <div className="rounded-md px-3 py-2.5 text-center" style={{ backgroundColor: C.bg }}><Label>Netwerk</Label><p className="mt-1 text-sm font-bold" style={{ color: C.text }}>€{energy_cost.network.cost_month}/mnd</p><p className="text-[10px]" style={{ color: C.faint }}>vast</p></div>
                                    </div>
                                )}

                                {/* Verduurzaming */}
                                {hasImprovements && energy_cost && (
                                    <div className="mt-6">
                                        {totalSaving > 0 && (
                                            <div className="mb-4 rounded-lg px-4 py-3" style={{ background: 'linear-gradient(135deg, #E6F4EA 0%, #D4EDDA 100%)', border: '1px solid #B7DFBF' }}>
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-bold" style={{ color: C.green }}>Bespaar tot €{totalSaving} per jaar</p>
                                                        <p className="mt-0.5 text-xs" style={{ color: C.muted }}>Vraag gratis en vrijblijvend offertes aan bij gecertificeerde installateurs.</p>
                                                    </div>
                                                    <span className="shrink-0 text-2xl">🌱</span>
                                                </div>
                                            </div>
                                        )}

                                        <Label>Verduurzamingsmogelijkheden</Label>

                                        <div className="mt-3 space-y-3">
                                            {energy_cost.improvements.map((imp) => {
                                                const url = buildOfferteUrl(imp.key, report.postcode);
                                                return (
                                                    <div key={imp.key} className="overflow-hidden rounded-lg border" style={{ borderColor: C.border }}>
                                                        <div className="px-4 py-3">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-sm font-bold" style={{ color: C.text }}>{imp.label}</p>
                                                                    <p className="mt-0.5 text-xs leading-relaxed" style={{ color: C.muted }}>{imp.description}</p>
                                                                </div>
                                                                <div className="shrink-0 rounded-md px-2.5 py-1.5 text-center" style={{ backgroundColor: C.greenBg }}>
                                                                    <p className="text-sm font-bold" style={{ color: C.green }}>-€{imp.saving_month}</p>
                                                                    <p className="text-[9px] font-medium" style={{ color: C.green }}>/maand</p>
                                                                </div>
                                                            </div>
                                                            <div className="mt-2 flex gap-4">
                                                                <span className="text-[11px]" style={{ color: C.faint }}>💰 €{imp.cost_min.toLocaleString('nl-NL')} – €{imp.cost_max.toLocaleString('nl-NL')}</span>
                                                                <span className="text-[11px]" style={{ color: C.faint }}>⏱ {imp.payback_years} jaar terugverdientijd</span>
                                                            </div>
                                                        </div>
                                                        {url && (
                                                            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-white transition-all hover:brightness-110" style={{ backgroundColor: C.navy }}>
                                                                Offertes aanvragen voor {OFFERTE_LABELS[imp.key] ?? imp.label.toLowerCase()} <ExternalIcon size={11} />
                                                            </a>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <p className="mt-4 text-[10px] leading-relaxed" style={{ color: C.faint }}>{energy_cost.note}</p>
                                    </div>
                                )}
                            </div>
                        ) : <p className="text-sm italic" style={{ color: C.faint }}>Geen energiegegevens beschikbaar voor dit adres.</p>}
                    </div>
                </div>

                {/* ═══ BUURTSTATISTIEKEN ═══ */}
                <Section title="Buurtstatistieken" available={!!neighborhood?.neighborhood_name}>
                    {neighborhood && (
                        <div>
                            <p className="mb-3 text-sm sm:mb-4" style={{ color: C.muted }}><span className="font-semibold" style={{ color: C.text }}>{neighborhood.neighborhood_name}</span>{neighborhood.municipality && `, ${neighborhood.municipality}`}</p>
                            <div className="grid grid-cols-2 gap-x-6 sm:gap-x-8">
                                <DataCell label="Inwoners" value={neighborhood.population} /><DataCell label="Dichtheid" value={neighborhood.population_density} suffix="/km²" />
                                <DataCell label="Huishoudens" value={neighborhood.households} /><DataCell label="Huishoudgrootte" value={neighborhood.avg_household_size} />
                                {neighborhood.avg_income && <DataCell label="Gem. inkomen" value={`€${Number(neighborhood.avg_income).toLocaleString('nl-NL')}`} />}
                                {neighborhood.avg_property_value && <DataCell label="Gem. WOZ-waarde" value={`€${Number(neighborhood.avg_property_value).toLocaleString('nl-NL')}`} />}
                                {neighborhood.cars_per_household && <DataCell label="Auto's per huishouden" value={neighborhood.cars_per_household} />}
                            </div>
                            {neighborhood.pct_0_14 != null && (
                                <div className="mt-5 sm:mt-6">
                                    <Label>Leeftijdsverdeling</Label>
                                    <div className="mt-2 flex h-6 gap-px overflow-hidden rounded">
                                        {AGE_GROUPS.map(({ key, color, label }) => { const val = neighborhood[key]; if (!val || val <= 0) return null; return <div key={key} className="relative" style={{ width: `${val}%`, backgroundColor: color }} title={`${label}: ${val}%`}>{val > 10 && <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow-sm">{val}%</span>}</div>; })}
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-3 sm:gap-4">
                                        {AGE_GROUPS.map(({ key, color, label }) => <div key={key} className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} /><span className="text-[10px]" style={{ color: C.faint }}>{label}</span></div>)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Section>

                {/* ═══ IN DE BUURT ═══ */}
                <Section title="In de buurt" available={!!nearby}>
                    {nearby && (
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                            {([
                                { key: 'supermarket' as const, icon: '🛒', label: 'Supermarkt' }, { key: 'school' as const, icon: '🏫', label: 'Basisschool' },
                                { key: 'doctor' as const, icon: '🏥', label: 'Huisarts' }, { key: 'park' as const, icon: '🌳', label: 'Park' },
                                { key: 'station' as const, icon: '🚉', label: 'Station' }, { key: 'pharmacy' as const, icon: '💊', label: 'Apotheek' },
                                { key: 'restaurant' as const, icon: '🍽️', label: 'Restaurant' }, { key: 'childcare' as const, icon: '👶', label: 'Kinderopvang' },
                            ]).map(({ key, icon, label }) => {
                                const cat = nearby[key]; if (!cat?.nearest_name) return null;
                                return (
                                    <div key={key} className="flex items-center gap-3 rounded-md px-3 py-2.5 sm:px-4 sm:py-3" style={{ backgroundColor: C.bg }}>
                                        <span className="shrink-0 text-lg">{icon}</span>
                                        <div className="min-w-0 flex-1"><Label>{label}</Label><p className="mt-0.5 text-sm font-semibold leading-tight" style={{ color: C.text }}>{cat.nearest_name}</p></div>
                                        <div className="shrink-0 text-right">
                                            <span className="text-sm font-semibold" style={{ color: C.text }}>{cat.nearest_distance_m! < 1000 ? `${cat.nearest_distance_m}m` : `${cat.nearest_distance_km}km`}</span>
                                            {cat.count > 1 && <p className="text-[10px]" style={{ color: C.faint }}>{cat.count} in buurt</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Section>

                {/* ═══ BODEMKWALITEIT ═══ */}
                <Section title="Bodemkwaliteit" available={soil?.has_data !== false}>
                    {soil && (
                        <div>
                            <RiskIndicator level={soil.status === 'verontreinigd' ? 'hoog' : soil.status === 'onderzocht' || soil.status === 'schoon' ? 'laag' : 'onbekend'} label="Status" />
                            {soil.message && <p className="mt-3 text-sm" style={{ color: C.muted }}>{soil.message}</p>}
                        </div>
                    )}
                </Section>

                {/* ═══ KLIMAATRISICO ═══ */}
                <Section title="Klimaatrisico" available={!!climate}>
                    {climate && (
                        <div>
                            {climate.viewer_url ? (
                                <div className="rounded-md px-4 py-4 text-center" style={{ backgroundColor: C.bg }}>
                                    <p className="mb-3 text-sm" style={{ color: C.muted }}>{climate.message ?? 'Bekijk de Klimaateffectatlas voor risico-informatie.'}</p>
                                    <a href={climate.viewer_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: C.navy }}>Open Klimaateffectatlas <ExternalIcon size={14} /></a>
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