interface EnergyLabelProps {
    label: string | null;
}

const LABEL_COLORS: Record<string, string> = {
    'A+++++': 'bg-green-700',
    'A++++': 'bg-green-600',
    'A+++': 'bg-green-500',
    'A++': 'bg-green-400',
    'A+': 'bg-green-400',
    A: 'bg-green-500',
    B: 'bg-lime-500',
    C: 'bg-yellow-400',
    D: 'bg-amber-400',
    E: 'bg-orange-400',
    F: 'bg-orange-500',
    G: 'bg-red-500',
};

export default function EnergyLabel({ label }: EnergyLabelProps) {
    if (!label) {
        return <span className="text-sm text-slate-400">Niet beschikbaar</span>;
    }

    return (
        <span
            className={`inline-flex items-center rounded-lg px-4 py-1.5 text-lg font-bold text-white ${LABEL_COLORS[label] ?? 'bg-slate-400'}`}
        >
            {label}
        </span>
    );
}