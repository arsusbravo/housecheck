<?php

namespace App\Services\HuisCheck;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class CbsService
{
    public function getByCoordinates(float $lat, float $lng): ?array
    {
        try {
            $rd = $this->wgs84ToRd($lat, $lng);

            $cacheKey = 'cbs_' . round($rd['x'], -2) . '_' . round($rd['y'], -2);

            return Cache::remember($cacheKey, now()->addDays(30), function () use ($rd) {
                return $this->fetchFromWfs($rd['x'], $rd['y']);
            });
        } catch (\Throwable $e) {
            Log::error('CBS exception', ['error' => $e->getMessage()]);
            return $this->defaultResponse();
        }
    }

    private function fetchFromWfs(float $x, float $y): ?array
    {
        $buffer = 10;
        $bbox = implode(',', [$x - $buffer, $y - $buffer, $x + $buffer, $y + $buffer]);

        $response = Http::timeout(15)->get('https://service.pdok.nl/cbs/wijkenbuurten/2024/wfs/v1_0', [
            'service' => 'WFS',
            'version' => '2.0.0',
            'request' => 'GetFeature',
            'typeName' => 'wijkenbuurten:buurten',
            'outputFormat' => 'application/json',
            'bbox' => $bbox,
            'count' => 1,
        ]);

        if ($response->failed()) {
            Log::warning('CBS WFS failed', ['status' => $response->status()]);
            return $this->defaultResponse();
        }

        $p = $response->json('features.0.properties');

        if (!$p) {
            return $this->defaultResponse();
        }

        // Exact property names from PDOK CBS wijkenbuurten 2024 WFS
        return [
            'neighborhood_name' => trim($p['buurtnaam'] ?? ''),
            'municipality' => trim($p['gemeentenaam'] ?? ''),
            'population' => $this->num($p['aantalInwoners'] ?? null),
            'households' => $this->num($p['aantalHuishoudens'] ?? null),
            'avg_household_size' => $this->num($p['gemiddeldeHuishoudsgrootte'] ?? null),
            'population_density' => $this->num($p['bevolkingsdichtheidInwonersPerKm2'] ?? null),
            'pct_0_14' => $this->num($p['percentagePersonen0Tot15Jaar'] ?? null),
            'pct_15_24' => $this->num($p['percentagePersonen15Tot25Jaar'] ?? null),
            'pct_25_44' => $this->num($p['percentagePersonen25Tot45Jaar'] ?? null),
            'pct_45_64' => $this->num($p['percentagePersonen45Tot65Jaar'] ?? null),
            'pct_65_plus' => $this->num($p['percentagePersonen65JaarEnOuder'] ?? null),
            'avg_income' => $this->num($p['gemiddeldInkomenPerInkomensontvanger'] ?? null),
            'avg_property_value' => $this->num($p['gemiddeldeWoningwaarde'] ?? null),
            'distance_supermarket' => $this->num($p['groteSupermarktGemiddeldeAfstandInKm'] ?? null),
            'distance_school' => $this->num($p['basisonderwijsGemiddeldeAfstandInKm'] ?? null),
            'distance_gp' => $this->num($p['huisartsenpraktijkGemiddeldeAfstandInKm'] ?? null),
            // Extra data available from this WFS
            'pct_koopwoningen' => $this->num($p['percentageKoopwoningen'] ?? null),
            'pct_huurwoningen' => $this->num($p['percentageHuurwoningen'] ?? null),
            'cars_per_household' => $this->num($p['personenautosPerHuishouden'] ?? null),
        ];
    }

    /**
     * CBS uses -99995 and -99999999 for missing/suppressed data.
     */
    private function num(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        $num = is_numeric($value) ? (float) $value : null;

        if ($num === null || $num <= -9999) {
            return null;
        }

        return $num;
    }

    private function defaultResponse(): array
    {
        return [
            'neighborhood_name' => null,
            'municipality' => null,
            'message' => 'Buurtgegevens niet beschikbaar.',
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