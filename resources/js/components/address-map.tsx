import { useEffect, useRef } from 'react';
import type L from 'leaflet';

declare global {
    interface Window {
        L: typeof L;
    }
}

interface AddressMapProps {
    lat: number;
    lng: number;
    address?: string;
}

export default function AddressMap({ lat, lng, address }: AddressMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);

    useEffect(() => {
        if (!mapRef.current || !window.L || mapInstance.current) return;

        const leaflet = window.L;

        const map = leaflet.map(mapRef.current, {
            scrollWheelZoom: false,
            zoomControl: false,
        }).setView([lat, lng], 16);

        leaflet.control.zoom({ position: 'topright' }).addTo(map);

        leaflet
            .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap',
                maxZoom: 19,
            })
            .addTo(map);

        leaflet
            .marker([lat, lng])
            .addTo(map)
            .bindPopup(`<strong>${address ?? 'Locatie'}</strong>`)
            .openPopup();

        mapInstance.current = map;

        return () => {
            map.remove();
            mapInstance.current = null;
        };
    }, [lat, lng, address]);

    if (!lat || !lng) return null;

    return (
        <div
            className="overflow-hidden rounded-lg border"
            style={{ borderColor: '#E5E2DB' }}
        >
            <div ref={mapRef} className="h-64 w-full" />
        </div>
    );
}