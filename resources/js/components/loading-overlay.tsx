export default function LoadingOverlay() {
    return (
        <div
            className="fixed inset-0 z-9999 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(247, 246, 243, 0.95)' }}
        >
            <div className="text-center">
                <div
                    className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-[3px] border-t-transparent"
                    style={{ borderColor: '#E5E2DB', borderTopColor: '#D4A853' }}
                />
                <p
                    className="text-sm font-medium"
                    style={{ color: '#0B1D3A', fontFamily: "'Source Sans 3', sans-serif" }}
                >
                    Gegevens ophalen...
                </p>
            </div>
        </div>
    );
}