<?php

namespace App\Services\HuisCheck;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EpOnlineService
{
    private const BASE_URL = 'https://public.ep-online.nl/api/v5';

    /**
     * Get energy label for an address.
     * Requires API key from https://www.ep-online.nl/
     */
    public function getByAddress(string $postcode, string $houseNumber, ?string $houseLetter = null): ?array
    {
        $apiKey = config('huischeck.ep_online_api_key');

        if (!$apiKey) {
            Log::warning('EP-Online API key not configured');
            return null;
        }

        try {
            $params = [
                'postcode' => str_replace(' ', '', $postcode),
                'huisnummer' => $houseNumber,
            ];

            if ($houseLetter) {
                $params['huisletter'] = $houseLetter;
            }

            $response = Http::timeout(10)
                ->withHeaders([
                    'Authorization' => $apiKey,
                    'Accept' => 'application/json',
                ])
                ->get(self::BASE_URL . '/PandEnergielabel/Adres', $params);

            if ($response->failed()) {
                Log::warning('EP-Online API failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                    'postcode' => $postcode,
                ]);
                return null;
            }

            $data = $response->json();

            Log::info('EP-Online response', ['status' => $response->status(), 'data' => $data]);

            // EP-Online may return an array of labels; take the most recent
            if (is_array($data) && !empty($data)) {
                // V5 might return a single object or array
                $items = isset($data[0]) ? $data : [$data];
                $latest = collect($items)->sortByDesc('Opnamedatum')->first();

                return [
                    'label' => $latest['Energieklasse'] ?? $latest['labelLetter'] ?? null,
                    'energy_index' => $latest['BerekendeEnergieverbruik'] ?? $latest['energieIndex'] ?? null,
                    'registration_date' => isset($latest['Opnamedatum']) ? substr($latest['Opnamedatum'], 0, 10) : null,
                    'valid_until' => isset($latest['Geldig_tot']) ? substr($latest['Geldig_tot'], 0, 10) : null,
                    'is_definitive' => !($latest['Op_basis_van_referentiegebouw'] ?? false),
                    'building_type' => $latest['Gebouwtype'] ?? null,
                ];
            }

            return null;
        } catch (\Throwable $e) {
            Log::error('EP-Online exception', ['error' => $e->getMessage()]);
            return null;
        }
    }
}