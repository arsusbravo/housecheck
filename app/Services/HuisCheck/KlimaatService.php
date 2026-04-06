<?php

namespace App\Services\HuisCheck;

use Illuminate\Support\Facades\Log;

class KlimaatService
{
    /**
     * The national Klimaateffectatlas moved their WMS to ArcGIS services.
     * For the MVP, we provide the direct viewer link for the coordinates.
     * TODO: Integrate ArcGIS MapServer REST API for programmatic access.
     */
    public function getByCoordinates(float $lat, float $lng): ?array
    {
        try {
            return [
                'flood_risk' => ['available' => false, 'risk_level' => 'onbekend'],
                'heat_stress' => ['available' => false, 'risk_level' => 'onbekend'],
                'subsidence' => ['available' => false, 'risk_level' => 'onbekend'],
                'overall_risk' => 'onbekend',
                'viewer_url' => "https://www.klimaateffectatlas.nl/nl/viewer?lat={$lat}&lng={$lng}&zoom=14",
                'message' => 'Bekijk de Klimaateffectatlas voor gedetailleerde risico-informatie.',
            ];
        } catch (\Throwable $e) {
            Log::error('Klimaat exception', ['error' => $e->getMessage()]);
            return null;
        }
    }
}