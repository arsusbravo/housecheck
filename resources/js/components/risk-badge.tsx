import type { RiskLevel } from '@/types/huischeck';

interface RiskBadgeProps {
    level: RiskLevel;
}

const RISK_CONFIG: Record<
    RiskLevel,
    { bg: string; text: string; label: string; dot: string }
> = {
    laag: { bg: 'bg-green-100', text: 'text-green-800', label: 'Laag risico', dot: 'bg-green-500' },
    gemiddeld: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Gemiddeld', dot: 'bg-yellow-500' },
    hoog: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Hoog risico', dot: 'bg-orange-500' },
    zeer_hoog: { bg: 'bg-red-100', text: 'text-red-800', label: 'Zeer hoog', dot: 'bg-red-500' },
    onbekend: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Onbekend', dot: 'bg-slate-400' },
};

export default function RiskBadge({ level }: RiskBadgeProps) {
    const c = RISK_CONFIG[level] ?? RISK_CONFIG.onbekend;

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${c.bg} ${c.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
            {c.label}
        </span>
    );
}