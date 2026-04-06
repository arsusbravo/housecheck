import AddressSearch from '@/components/address-search';
import HuisCheckLayout from '@/layouts/huischeck-layout';

function Index() {
    return (
        <div className="flex min-h-[92vh] flex-col items-center justify-center px-4">
            <div className="w-full max-w-xl">
                {/* Branding */}
                <div className="mb-12 text-center">
                    <div
                        className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full"
                        style={{ backgroundColor: '#0B1D3A' }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4A853" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 21h18" />
                            <path d="M5 21V7l7-4 7 4v14" />
                            <path d="M9 21v-6h6v6" />
                        </svg>
                    </div>
                    <h1
                        className="mb-2 text-3xl font-bold tracking-tight"
                        style={{ fontFamily: "'Libre Baskerville', serif", color: '#0B1D3A' }}
                    >
                        HuisCheck
                    </h1>
                    <p className="text-base" style={{ color: '#6B6560', lineHeight: '1.6' }}>
                        Onafhankelijke adresrapportage op basis van overheidsdata.
                        <br />
                        Bouwjaar, energielabel, bodem, klimaat en buurtcijfers.
                    </p>
                </div>

                {/* Search */}
                <AddressSearch autoFocus />

                {/* Feature list */}
                <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2">
                    {['Bouwjaar & oppervlakte', 'Energielabel', 'Bodemkwaliteit', 'Klimaatrisico', 'Buurtstatistieken'].map((item) => (
                        <span
                            key={item}
                            className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider"
                            style={{ color: '#9C9689' }}
                        >
                            <span style={{ color: '#D4A853' }}>&#9679;</span>
                            {item}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

Index.layout = (page: React.ReactNode) => <HuisCheckLayout title="HuisCheck — Adresrapportage">{page}</HuisCheckLayout>;

export default Index;