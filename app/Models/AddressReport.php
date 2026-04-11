<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class AddressReport extends Model
{
    protected $fillable = [
        'address',
        'postcode',
        'city',
        'pdok_id',
        'latitude',
        'longitude',
        'bag_data',
        'energy_data',
        'energy_cost_data',
        'soil_data',
        'climate_data',
        'neighborhood_data',
        'nearby_data',
        'raw_responses',
        'fetched_at',
    ];

    protected function casts(): array
    {
        return [
            'bag_data' => 'array',
            'energy_data' => 'array',
            'energy_cost_data' => 'array',
            'soil_data' => 'array',
            'climate_data' => 'array',
            'neighborhood_data' => 'array',
            'nearby_data' => 'array',
            'raw_responses' => 'array',
            'fetched_at' => 'datetime',
        ];
    }

    /**
     * Check if this report is still fresh enough to use.
     */
    public function isFresh(int $maxAgeDays = 90): bool
    {
        return $this->fetched_at->diffInDays(now()) < $maxAgeDays;
    }

    /**
     * Find a cached report by postcode + address combo.
     */
    public static function findCached(string $postcode, string $address, int $maxAgeDays = 90): ?self
    {
        $report = self::where('postcode', $postcode)
            ->where('address', $address)
            ->first();

        if ($report && $report->isFresh($maxAgeDays)) {
            return $report;
        }

        return null;
    }

    /**
     * Get a human-readable summary for the frontend.
     */
    public function getSummaryAttribute(): array
    {
        return [
            'id' => $this->id,
            'address' => $this->address,
            'postcode' => $this->postcode,
            'city' => $this->city,
            'coordinates' => [
                'lat' => $this->latitude,
                'lng' => $this->longitude,
            ],
            'building' => $this->bag_data,
            'energy' => $this->energy_data,
            'energy_cost' => $this->energy_cost_data,
            'soil' => $this->soil_data,
            'climate' => $this->climate_data,
            'neighborhood' => $this->neighborhood_data,
            'nearby' => $this->nearby_data,
            'fetched_at' => $this->fetched_at?->toIso8601String(),
            'age_days' => $this->fetched_at?->diffInDays(now()),
        ];
    }
}