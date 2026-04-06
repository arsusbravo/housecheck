<?php

namespace App\Services\HuisCheck;

use App\Models\AddressReport;
use Illuminate\Support\Facades\Log;

class HuisCheckOrchestrator
{
    public function __construct(
        private PdokService $pdok,
        private BagService $bag,
        private EpOnlineService $epOnline,
        private BodemService $bodem,
        private KlimaatService $klimaat,
        private CbsService $cbs,
    ) {}

    /**
     * Autocomplete address suggestions.
     */
    public function suggest(string $query): array
    {
        return $this->pdok->suggest($query);
    }

    /**
     * Run the full house check for a PDOK address ID.
     * Returns cached data if available and fresh.
     */
    public function check(string $pdokId, int $maxAgeDays = 90): AddressReport
    {
        // Phase 1: Resolve the address
        $location = $this->pdok->lookup($pdokId);

        if (!$location) {
            throw new \RuntimeException('Adres niet gevonden via PDOK.');
        }

        // Check cache
        $cached = AddressReport::findCached($location['postcode'], $location['address'], $maxAgeDays);

        if ($cached) {
            Log::info('HuisCheck cache hit', ['address' => $location['address']]);
            return $cached;
        }

        // Phase 2-5: Fetch all data (parallel where possible)
        $data = $this->fetchAllData($location);

        // Store in database
        $report = AddressReport::updateOrCreate(
            [
                'postcode' => $location['postcode'],
                'address' => $location['address'],
            ],
            [
                'city' => $location['city'],
                'pdok_id' => $pdokId,
                'latitude' => $location['lat'],
                'longitude' => $location['lng'],
                'bag_data' => $data['bag'],
                'energy_data' => $data['energy'],
                'soil_data' => $data['soil'],
                'climate_data' => $data['climate'],
                'neighborhood_data' => $data['neighborhood'],
                'raw_responses' => $data['raw'] ?? null,
                'fetched_at' => now(),
            ]
        );

        Log::info('HuisCheck completed', [
            'address' => $location['address'],
            'phases_completed' => collect($data)->filter()->count(),
        ]);

        return $report;
    }

    /**
     * Fetch data from all APIs.
     * BAG + EP-Online run first (need address details),
     * then soil + climate + CBS run in parallel (only need coordinates).
     */
    private function fetchAllData(array $location): array
    {
        $lat = $location['lat'];
        $lng = $location['lng'];
        $postcode = $location['postcode'];
        $houseNumber = $location['house_number'];

        // Phase 2: Building specs (spatial query using coordinates)
        $bagData = $this->bag->getByCoordinates($lat, $lng);

        // Phase 3: Energy label
        $energyData = $this->epOnline->getByAddress(
            $postcode,
            $houseNumber,
        );

        // Phase 4 & 5: These only need coordinates, run them in parallel
        // Using simple sequential calls here for clarity.
        // For true parallelism, use Laravel's Http::pool or queue jobs.
        $soilData = $this->bodem->getByCoordinates($lat, $lng);
        $climateData = $this->klimaat->getByCoordinates($lat, $lng);
        $neighborhoodData = $this->cbs->getByCoordinates($lat, $lng);

        return [
            'bag' => $bagData,
            'energy' => $energyData,
            'soil' => $soilData,
            'climate' => $climateData,
            'neighborhood' => $neighborhoodData,
        ];
    }
}