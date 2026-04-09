<?php

namespace App\Services\HuisCheck;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NearbyService
{
    // Multiple mirrors — try in order
    private const OVERPASS_URLS = [
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass-api.de/api/interpreter',
    ];

    /**
     * Find nearby amenities using OpenStreetMap Overpass API.
     */
    public function getByCoordinates(float $lat, float $lng, int $radius = 1500): ?array
    {
        $query = $this->buildQuery($lat, $lng, $radius);

        foreach (self::OVERPASS_URLS as $url) {
            try {
                $response = Http::timeout(20)
                    ->asForm()
                    ->post($url, ['data' => $query]);

                if ($response->ok()) {
                    $elements = $response->json('elements', []);
                    return $this->categorize($elements, $lat, $lng);
                }

                Log::info('Overpass mirror failed, trying next', ['url' => $url, 'status' => $response->status()]);
            } catch (\Throwable $e) {
                Log::info('Overpass mirror timeout', ['url' => $url, 'error' => $e->getMessage()]);
            }
        }

        Log::warning('All Overpass mirrors failed');
        return null;
    }

    /**
     * Lightweight query — uses node (not nwr) for point amenities,
     * nwr only for areas like parks. Keeps timeout short.
     */
    private function buildQuery(float $lat, float $lng, int $radius): string
    {
        return <<<OVERPASS
[out:json][timeout:15];
(
  node["shop"="supermarket"](around:{$radius},{$lat},{$lng});
  node["amenity"="school"](around:{$radius},{$lat},{$lng});
  node["amenity"="doctors"](around:{$radius},{$lat},{$lng});
  node["healthcare"="doctor"](around:{$radius},{$lat},{$lng});
  nwr["leisure"="park"](around:{$radius},{$lat},{$lng});
  node["railway"="station"](around:{$radius},{$lat},{$lng});
  node["railway"="halt"](around:{$radius},{$lat},{$lng});
  node["amenity"="pharmacy"](around:{$radius},{$lat},{$lng});
  node["amenity"="restaurant"](around:{$radius},{$lat},{$lng});
  node["amenity"="kindergarten"](around:{$radius},{$lat},{$lng});
);
out center tags;
OVERPASS;
    }

    private function categorize(array $elements, float $originLat, float $originLng): array
    {
        $categories = [
            'supermarket' => ['items' => [], 'max' => 3],
            'school' => ['items' => [], 'max' => 3],
            'doctor' => ['items' => [], 'max' => 3],
            'park' => ['items' => [], 'max' => 3],
            'station' => ['items' => [], 'max' => 2],
            'pharmacy' => ['items' => [], 'max' => 2],
            'restaurant' => ['items' => [], 'max' => 3],
            'childcare' => ['items' => [], 'max' => 2],
        ];

        foreach ($elements as $el) {
            $tags = $el['tags'] ?? [];
            $elLat = $el['lat'] ?? $el['center']['lat'] ?? null;
            $elLng = $el['lon'] ?? $el['center']['lon'] ?? null;

            if (!$elLat || !$elLng) continue;

            $name = $tags['name'] ?? null;
            if (!$name) continue;

            $distance = $this->haversine($originLat, $originLng, $elLat, $elLng);

            $item = [
                'name' => $name,
                'distance_m' => (int) $distance,
                'distance_km' => round($distance / 1000, 1),
            ];

            $category = $this->detect($tags);
            if ($category && isset($categories[$category])) {
                $categories[$category]['items'][] = $item;
            }
        }

        $result = [];
        foreach ($categories as $key => $cat) {
            $sorted = collect($cat['items'])
                ->sortBy('distance_m')
                ->take($cat['max'])
                ->values()
                ->all();

            $nearest = $sorted[0] ?? null;

            $result[$key] = [
                'nearest_name' => $nearest['name'] ?? null,
                'nearest_distance_m' => $nearest['distance_m'] ?? null,
                'nearest_distance_km' => $nearest['distance_km'] ?? null,
                'count' => count($sorted),
                'items' => $sorted,
            ];
        }

        return $result;
    }

    private function detect(array $tags): ?string
    {
        if (($tags['shop'] ?? '') === 'supermarket') return 'supermarket';
        if (($tags['amenity'] ?? '') === 'school') return 'school';
        if (($tags['amenity'] ?? '') === 'doctors' || ($tags['healthcare'] ?? '') === 'doctor') return 'doctor';
        if (($tags['leisure'] ?? '') === 'park') return 'park';
        if (($tags['railway'] ?? '') === 'station' || ($tags['railway'] ?? '') === 'halt') return 'station';
        if (($tags['amenity'] ?? '') === 'pharmacy') return 'pharmacy';
        if (($tags['amenity'] ?? '') === 'restaurant') return 'restaurant';
        if (($tags['amenity'] ?? '') === 'kindergarten') return 'childcare';

        return null;
    }

    private function haversine(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $r = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        return $r * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}