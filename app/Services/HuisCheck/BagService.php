<?php

namespace App\Services\HuisCheck;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BagService
{
    /**
     * Get building data. Tries Kadaster API first (if key available),
     * then falls back to spatial WFS query.
     */
    public function getByAddress(string $objectId, float $lat, float $lng): ?array
    {
        $apiKey = config('huischeck.bag_api_key');

        if ($apiKey && $objectId) {
            $result = $this->fromKadasterApi($objectId, $apiKey);
            if ($result) return $result;
        }

        return $this->getByCoordinates($lat, $lng);
    }

    /**
     * Official Kadaster BAG API Individuele Bevragingen v2.
     * Uses the nummeraanduiding_id from PDOK for exact lookup.
     */
    private function fromKadasterApi(string $objectId, string $apiKey): ?array
    {
        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'X-Api-Key' => $apiKey,
                    'Accept' => 'application/hal+json',
                    'Accept-Crs' => 'epsg:28992',
                ])
                ->get('https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2/adressenuitgebreid', [
                    'adresseerbaarObjectIdentificatie' => $objectId,
                ]);

            if ($response->failed()) {
                Log::warning('BAG Kadaster API failed', [
                    'status' => $response->status(),
                    'body' => substr($response->body(), 0, 300),
                ]);
                return null;
            }

            $data = $response->json('_embedded.adressen.0');

            if (!$data) {
                Log::info('BAG Kadaster API returned no adressen', ['id' => $objectId]);
                return null;
            }

            $gebruiksdoelen = $data['gebruiksdoelen'] ?? [];

            return [
                'bouwjaar' => $data['oorspronkelijkBouwjaar'] ?? null,
                'oppervlakte' => $data['oppervlakte'] ?? null,
                'gebruiksdoel' => is_array($gebruiksdoelen) ? $gebruiksdoelen : [$gebruiksdoelen],
                'status' => $data['statusVerblijfsobject'] ?? null,
                'pandId' => $data['pandIdentificaties'][0] ?? null,
                'source' => 'kadaster',
            ];
        } catch (\Throwable $e) {
            Log::error('BAG Kadaster API error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Fallback: spatial WFS query using RD coordinates.
     */
    public function getByCoordinates(float $lat, float $lng): ?array
    {
        try {
            $rd = $this->wgs84ToRd($lat, $lng);

            $buffer = 10;
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
                // Try wider (50m)
                return $this->widerSpatialQuery($rd['x'], $rd['y']);
            }

            return $this->normalizeWfs($props);
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

            return $props ? $this->normalizeWfs($props) : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function normalizeWfs(array $props): array
    {
        $doel = $props['gebruiksdoel'] ?? [];

        return [
            'bouwjaar' => $props['bouwjaar'] ?? null,
            'oppervlakte' => $props['oppervlakte'] ?? null,
            'gebruiksdoel' => is_string($doel) ? array_map('trim', explode(',', $doel)) : (is_array($doel) ? $doel : []),
            'status' => $props['status'] ?? null,
            'pandId' => $props['pandidentificatie'] ?? null,
            'source' => 'wfs',
        ];
    }

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