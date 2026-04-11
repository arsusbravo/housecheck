import { Head } from '@inertiajs/react';

import ShortlistBar from '@/components/shortlist-bar';

interface HuisCheckLayoutProps {
    children: React.ReactNode;
    title?: string;
}

export default function HuisCheckLayout({ children, title = 'HuisCheck' }: HuisCheckLayoutProps) {
    return (
        <>
            <Head>
                <title>{title}</title>
                <meta name="description" content="Adresrapportage: bouwjaar, energielabel, bodemkwaliteit, klimaatrisico en buurtstatistieken." />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" />
            </Head>
            <div
                className="min-h-screen pb-20"
                style={{
                    fontFamily: "'Source Sans 3', sans-serif",
                    backgroundColor: '#F7F6F3',
                    color: '#1A1A1A',
                }}
            >
                {children}

                <footer
                    className="border-t px-6 py-8 text-center text-xs tracking-wide"
                    style={{
                        borderColor: '#E5E2DB',
                        color: '#9C9689',
                        fontFamily: "'Source Sans 3', sans-serif",
                    }}
                >
                    <div className="mx-auto max-w-4xl">
                        <p className="mb-1 font-medium uppercase tracking-widest" style={{ fontSize: '10px' }}>
                            Bronnen
                        </p>
                        <p>
                            PDOK Locatieserver &middot; BAG Kadaster &middot; EP-Online RVO &middot; Bodemloket &middot; Klimaateffectatlas &middot; CBS StatLine
                        </p>
                        <p className="mt-3" style={{ color: '#B8B3AA' }}>
                            Deze rapportage is informatief en geen vervanging voor professioneel advies.
                        </p>
                    </div>
                </footer>

                <ShortlistBar />
            </div>
        </>
    );
}