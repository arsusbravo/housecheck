<?php

namespace App\Services\HuisCheck;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BodemService
{
    private const WMS_URL = 'https://gis.gdngeoservices.nl/standalone/services/blk_gdn/lks_blk_rd_v1/MapServer/WMSServer';

    /**
     * Query Bodemloket for soil data at given coordinates.
     * Uses WMS GetFeatureInfo with EPSG:4326 (WGS84).
     */
    public function getByCoordinates(float $lat, float $lng): ?array
    {
        try {
            $buffer = 0.0005; // ~50m in degrees
            $bbox = implode(',', [
                $lat - $buffer,
                $lng - $buffer,
                $lat + $buffer,
                $lng + $buffer,
            ]);

            // Query all soil layers
            $response = Http::timeout(15)->get(self::WMS_URL, [
                'SERVICE' => 'WMS',
                'VERSION' => '1.3.0',
                'REQUEST' => 'GetFeatureInfo',
                'LAYERS' => 'WBB_locaties',
                'QUERY_LAYERS' => 'WBB_locaties',
                'INFO_FORMAT' => 'application/geo+json',
                'CRS' => 'EPSG:4326',
                'BBOX' => $bbox,
                'WIDTH' => 256,
                'HEIGHT' => 256,
                'I' => 128,
                'J' => 128,
            ]);

            if ($response->failed()) {
                Log::warning('Bodemloket WMS failed', ['status' => $response->status()]);
                return $this->noDataResponse();
            }

            $body = $response->json();
            $features = $body['features'] ?? [];

            if (empty($features)) {
                return [
                    'has_data' => true,
                    'status' => 'schoon',
                    'message' => 'Geen bekende bodemonderzoeken of verontreinigingen op deze locatie.',
                    'investigations' => [],
                ];
            }

            return [
                'has_data' => true,
                'status' => $this->interpretStatus($features),
                'features_count' => count($features),
                'investigations' => collect($features)->take(5)->map(fn ($f) => [
                    'type' => $f['properties']['Type'] ?? $f['properties']['type'] ?? 'Onderzoek',
                    'status' => $f['properties']['Status'] ?? $f['properties']['status'] ?? null,
                    'description' => $f['properties']['Omschrijving'] ?? $f['properties']['omschrijving'] ?? null,
                ])->all(),
            ];
        } catch (\Throwable $e) {
            Log::error('Bodemloket exception', ['error' => $e->getMessage()]);
            return $this->noDataResponse();
        }
    }

    private function interpretStatus(array $features): string
    {
        foreach ($features as $feature) {
            $status = strtolower(json_encode($feature['properties'] ?? []));
            if (str_contains($status, 'ernstig') || str_contains($status, 'verontreinig')) {
                return 'verontreinigd';
            }
        }

        return 'onderzocht';
    }

    private function noDataResponse(): array
    {
        return [
            'has_data' => false,
            'status' => 'niet_beschikbaar',
            'message' => 'Bodemgegevens konden niet worden opgehaald.',
            'investigations' => [],
        ];
    }
}