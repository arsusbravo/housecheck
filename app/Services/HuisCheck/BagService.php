<?php

namespace App\Services\HuisCheck;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BagService
{
    /**
     * Get building data using a spatial query with coordinates.
     */
    public function getByCoordinates(float $lat, float $lng): ?array
    {
        try {
            // Convert WGS84 to Rijksdriehoek — BAG WFS uses EPSG:28992
            $rd = $this->wgs84ToRd($lat, $lng);

            $buffer = 10; // 10m around the point
            $bbox = implode(',', [
                $rd['x'] - $buffer,
                $rd['y'] - $buffer,
                $rd['x'] + $buffer,
                $rd['y'] + $buffer,
            ]);

            $response = Http::timeout(10)->get('https://service.pdok.nl/lv/bag/wfs/v2_0', [
                'service' => 'WFS',
                'version' => '2.0.0',
                'request' => 'GetFeature',
                'typeName' => 'bag:verblijfsobject',
                'outputFormat' => 'application/json',
                'bbox' => $bbox,
                'count' => 1,
            ]);

            if ($response->failed()) {
                Log::warning('BAG WFS spatial failed', ['status' => $response->status()]);
                return null;
            }

            $props = $response->json('features.0.properties');

            if (!$props) {
                // Try wider (50m) — point might be slightly off
                return $this->widerSpatialQuery($rd['x'], $rd['y']);
            }

            return $this->normalize($props);
        } catch (\Throwable $e) {
            Log::error('BAG spatial error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    private function widerSpatialQuery(float $x, float $y): ?array
    {
        try {
            $buffer = 50;
            $bbox = implode(',', [$x - $buffer, $y - $buffer, $x + $buffer, $y + $buffer]);

            $response = Http::timeout(10)->get('https://service.pdok.nl/lv/bag/wfs/v2_0', [
                'service' => 'WFS',
                'version' => '2.0.0',
                'request' => 'GetFeature',
                'typeName' => 'bag:verblijfsobject',
                'outputFormat' => 'application/json',
                'bbox' => $bbox,
                'count' => 1,
            ]);

            if ($response->failed()) return null;

            $props = $response->json('features.0.properties');

            return $props ? $this->normalize($props) : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function normalize(array $props): array
    {
        $doel = $props['gebruiksdoel'] ?? $props['gebruiksdoelen'] ?? [];

        return [
            'bouwjaar' => $props['bouwjaar'] ?? null,
            'oppervlakte' => $props['oppervlakte'] ?? null,
            'gebruiksdoel' => is_string($doel) ? array_map('trim', explode(',', $doel)) : (is_array($doel) ? $doel : []),
            'status' => $props['status'] ?? null,
            'pandId' => $props['pandidentificatie'] ?? null,
        ];
    }

    /**
     * WGS84 (lat/lng) to Rijksdriehoek (EPSG:28992).
     */
    private function wgs84ToRd(float $lat, float $lng): array
    {
        $dLat = 0.36 * ($lat - 52.15517);
        $dLng = 0.36 * ($lng - 5.38721);

        $x = 155000
            + (190094.945 * $dLng)
            + (-11832.228 * $dLat * $dLng)
            + (-114.221 * $dLat * $dLat * $dLng);

        $y = 463000
            + (309056.544 * $dLat)
            + (3638.893 * $dLng * $dLng)
            + (72.971 * $dLat * $dLat);

        return ['x' => round($x, 2), 'y' => round($y, 2)];
    }
}