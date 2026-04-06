<?php

namespace App\Services\HuisCheck;

use Illuminate\Support\Facades\Http;

class PdokService
{
    private const BASE_URL = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1';

    /**
     * Autocomplete address suggestions for the search bar.
     *
     * @return array<int, array{id: string, label: string, type: string}>
     */
    public function suggest(string $query, int $rows = 5): array
    {
        $response = Http::timeout(5)->get(self::BASE_URL . '/suggest', [
            'q' => $query,
            'fq' => 'type:adres',
            'rows' => $rows,
        ]);

        if ($response->failed()) {
            return [];
        }

        $docs = $response->json('response.docs', []);

        return collect($docs)->map(fn (array $doc) => [
            'id' => $doc['id'],
            'label' => $doc['weergavenaam'] ?? '',
            'type' => $doc['type'] ?? '',
            'score' => $doc['score'] ?? 0,
        ])->all();
    }

    /**
     * Lookup full details for a specific address by its PDOK id.
     *
     * @return array{id: string, address: string, postcode: string, city: string, lat: float, lng: float, nummeraanduiding_id: string}|null
     */
    public function lookup(string $id): ?array
    {
        $response = Http::timeout(5)->get(self::BASE_URL . '/lookup', [
            'id' => $id,
        ]);

        if ($response->failed()) {
            return null;
        }

        $doc = $response->json('response.docs.0');

        if (!$doc) {
            return null;
        }

        // Parse centroide_ll which is "POINT(lng lat)"
        $coords = $this->parsePoint($doc['centroide_ll'] ?? '');

        return [
            'id' => $doc['id'],
            'address' => $doc['weergavenaam'] ?? '',
            'postcode' => $doc['postcode'] ?? '',
            'city' => $doc['woonplaatsnaam'] ?? '',
            'street' => $doc['straatnaam'] ?? '',
            'house_number' => ($doc['huis_nlt'] ?? ''),
            'lat' => $coords['lat'],
            'lng' => $coords['lng'],
            'nummeraanduiding_id' => $doc['nummeraanduiding_id'] ?? '',
            'adresseerbaarobject_id' => $doc['adresseerbaarobject_id'] ?? '',
        ];
    }

    /**
     * Parse "POINT(lng lat)" string into coordinates.
     */
    private function parsePoint(string $point): array
    {
        if (preg_match('/POINT\(([0-9.]+)\s+([0-9.]+)\)/', $point, $matches)) {
            return [
                'lng' => (float) $matches[1],
                'lat' => (float) $matches[2],
            ];
        }

        return ['lat' => 0, 'lng' => 0];
    }
}