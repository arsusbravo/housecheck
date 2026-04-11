<?php

namespace App\Services\HuisCheck;

/**
 * Estimates energy costs based on energielabel, oppervlakte, bouwjaar, and gebouwtype.
 * Uses RVO reference consumption values and current Dutch energy prices.
 *
 * Sources:
 * - RVO Energielabel referentiewaarden
 * - CBS gemiddeld energieverbruik per woningtype
 * - ACM energietarieven (updated periodically)
 */
class EnergyCostService
{
    // Average Dutch energy prices (2025/2026, incl. BTW, excl. subsidies)
    // Update these periodically
    private const GAS_PRICE_M3 = 1.45;       // €/m³
    private const ELECTRICITY_PRICE_KWH = 0.40; // €/kWh
    private const NETWORK_COSTS_MONTH = 25.00;  // €/month fixed

    // Gas consumption m³/year per label class (average Dutch home ~100m²)
    // Source: RVO/CBS referentiewaarden, scaled per 100m²
    private const GAS_PER_LABEL = [
        'A+++++' => 0,
        'A++++' => 100,
        'A+++' => 200,
        'A++' => 300,
        'A+' => 400,
        'A' => 600,
        'B' => 900,
        'C' => 1200,
        'D' => 1400,
        'E' => 1600,
        'F' => 1800,
        'G' => 2100,
    ];

    // Electricity consumption kWh/year base (average household)
    private const ELECTRICITY_BASE_KWH = 2800;

    // Building type multipliers for gas (relative to tussenwoning)
    private const TYPE_MULTIPLIERS = [
        'Rijwoning tussen' => 1.0,
        'Tussenwoning' => 1.0,
        'Tussenmidden' => 1.0,
        'Hoekwoning' => 1.15,
        'Hoekmidden' => 1.10,
        'Hoekbegin' => 1.15,
        'Twee-onder-een-kap' => 1.25,
        '2-onder-1-kap' => 1.25,
        'Vrijstaand' => 1.50,
        'Vrijstaande woning' => 1.50,
        'Appartement' => 0.75,
        'Flat' => 0.75,
        'Maisonette' => 0.85,
    ];

    // Bouwjaar correction factor (older = leakier)
    private const YEAR_CORRECTIONS = [
        [1900, 1945, 1.25],
        [1946, 1964, 1.15],
        [1965, 1974, 1.10],
        [1975, 1991, 1.00],
        [1992, 2005, 0.90],
        [2006, 2014, 0.80],
        [2015, 2020, 0.70],
        [2021, 2030, 0.55],
    ];

    // Improvement suggestions with costs and savings
    private const IMPROVEMENTS = [
        'spouwmuurisolatie' => [
            'label' => 'Spouwmuurisolatie',
            'description' => 'Isolatie van spouwmuren reduceert warmteverlies aanzienlijk.',
            'cost_min' => 2500,
            'cost_max' => 5000,
            'gas_saving_pct' => 15,
            'applicable_before_year' => 1985,
            'applicable_labels' => ['D', 'E', 'F', 'G'],
        ],
        'dakisolatie' => [
            'label' => 'Dakisolatie',
            'description' => 'Via het dak gaat tot 30% van de warmte verloren.',
            'cost_min' => 3000,
            'cost_max' => 8000,
            'gas_saving_pct' => 15,
            'applicable_before_year' => 2000,
            'applicable_labels' => ['C', 'D', 'E', 'F', 'G'],
        ],
        'hr_glas' => [
            'label' => 'HR++ beglazing',
            'description' => 'Vervang enkel of dubbelglas door HR++ voor minder warmteverlies.',
            'cost_min' => 4000,
            'cost_max' => 10000,
            'gas_saving_pct' => 10,
            'applicable_before_year' => 1995,
            'applicable_labels' => ['C', 'D', 'E', 'F', 'G'],
        ],
        'warmtepomp' => [
            'label' => 'Hybride warmtepomp',
            'description' => 'Verwarmt met buitenlucht, gas alleen bij extreme kou.',
            'cost_min' => 4000,
            'cost_max' => 7000,
            'gas_saving_pct' => 50,
            'applicable_before_year' => 2025,
            'applicable_labels' => ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        ],
        'zonnepanelen' => [
            'label' => 'Zonnepanelen (10 stuks)',
            'description' => 'Wek eigen stroom op en verlaag de elektriciteitsrekening.',
            'cost_min' => 5000,
            'cost_max' => 9000,
            'electricity_saving_kwh' => 3000,
            'applicable_before_year' => 2030,
            'applicable_labels' => ['A+++++', 'A++++', 'A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'],
        ],
    ];

    /**
     * Calculate estimated energy costs and improvement suggestions.
     */
    public function calculate(?array $bagData, ?array $energyData): ?array
    {
        if (!$bagData && !$energyData) {
            return null;
        }

        $label = $energyData['label'] ?? null;
        $rawBouwjaar = $bagData['bouwjaar'] ?? null;
        $rawOppervlakte = $bagData['oppervlakte'] ?? null;
        $bouwjaarNum = is_array($rawBouwjaar) ? (int) ($rawBouwjaar[0] ?? 0) : (int) $rawBouwjaar;
        $oppervlakte = is_array($rawOppervlakte) ? (int) ($rawOppervlakte[0] ?? 0) : (int) $rawOppervlakte;
        $bouwjaarNum = $bouwjaarNum ?: null;
        $oppervlakte = $oppervlakte ?: null;
        $gebouwtype = $energyData['building_type'] ?? null;

        // Estimate gas consumption
        $gasM3 = $this->estimateGasConsumption($label, $oppervlakte, $bouwjaarNum, $gebouwtype);
        $electricityKwh = $this->estimateElectricityConsumption($oppervlakte);

        // Calculate costs
        $gasCostYear = $gasM3 * self::GAS_PRICE_M3;
        $electricityCostYear = $electricityKwh * self::ELECTRICITY_PRICE_KWH;
        $networkCostYear = self::NETWORK_COSTS_MONTH * 12;
        $totalYear = $gasCostYear + $electricityCostYear + $networkCostYear;

        // Get applicable improvements
        $improvements = $this->getImprovements($label, $bouwjaarNum, $gasCostYear, $electricityCostYear);

        // Potential savings
        $totalSavingYear = collect($improvements)->sum('saving_year');

        return [
            'gas' => [
                'consumption_m3' => round($gasM3),
                'cost_year' => round($gasCostYear),
                'cost_month' => round($gasCostYear / 12),
                'price_m3' => self::GAS_PRICE_M3,
            ],
            'electricity' => [
                'consumption_kwh' => round($electricityKwh),
                'cost_year' => round($electricityCostYear),
                'cost_month' => round($electricityCostYear / 12),
                'price_kwh' => self::ELECTRICITY_PRICE_KWH,
            ],
            'network' => [
                'cost_year' => round($networkCostYear),
                'cost_month' => round(self::NETWORK_COSTS_MONTH),
            ],
            'total' => [
                'cost_year' => round($totalYear),
                'cost_month' => round($totalYear / 12),
            ],
            'improvements' => $improvements,
            'potential_saving_year' => round($totalSavingYear),
            'is_estimate' => true,
            'note' => 'Schatting op basis van energielabel, oppervlakte en woningtype. Werkelijk verbruik hangt af van bewonersgedrag en isolatiestaat.',
        ];
    }

    private function estimateGasConsumption(?string $label, ?int $oppervlakte, ?int $bouwjaar, ?string $gebouwtype): float
    {
        // Base consumption from label
        $baseGas = self::GAS_PER_LABEL[$label] ?? 1300; // default ~label D

        // Scale by surface area (reference is 100m²)
        $surfaceMultiplier = $oppervlakte ? ($oppervlakte / 100) : 1.0;
        // Cap the multiplier to avoid absurd values for very large/small homes
        $surfaceMultiplier = max(0.5, min($surfaceMultiplier, 3.0));

        // Building type multiplier
        $typeMultiplier = 1.0;
        if ($gebouwtype) {
            foreach (self::TYPE_MULTIPLIERS as $type => $mult) {
                if (stripos($gebouwtype, $type) !== false) {
                    $typeMultiplier = $mult;
                    break;
                }
            }
        }

        // Year correction
        $yearMultiplier = 1.0;
        if ($bouwjaar) {
            foreach (self::YEAR_CORRECTIONS as [$from, $to, $mult]) {
                if ($bouwjaar >= $from && $bouwjaar <= $to) {
                    $yearMultiplier = $mult;
                    break;
                }
            }
        }

        return $baseGas * $surfaceMultiplier * $typeMultiplier * $yearMultiplier;
    }

    private function estimateElectricityConsumption(?int $oppervlakte): float
    {
        $base = self::ELECTRICITY_BASE_KWH;

        // Larger homes tend to use more electricity
        if ($oppervlakte) {
            $factor = max(0.7, min($oppervlakte / 100, 2.0));
            return $base * $factor;
        }

        return $base;
    }

    private function getImprovements(?string $label, ?int $bouwjaar, float $gasCostYear, float $electricityCostYear): array
    {
        $results = [];

        foreach (self::IMPROVEMENTS as $key => $imp) {
            // Check if applicable for this label
            if ($label && !in_array($label, $imp['applicable_labels'])) {
                continue;
            }

            // Check if applicable for this building age
            if ($bouwjaar && $bouwjaar >= $imp['applicable_before_year']) {
                continue;
            }

            $savingYear = 0;

            if (isset($imp['gas_saving_pct'])) {
                $savingYear += $gasCostYear * ($imp['gas_saving_pct'] / 100);
            }

            if (isset($imp['electricity_saving_kwh'])) {
                $savingYear += $imp['electricity_saving_kwh'] * self::ELECTRICITY_PRICE_KWH;
            }

            if ($savingYear <= 0) continue;

            $avgCost = ($imp['cost_min'] + $imp['cost_max']) / 2;
            $paybackYears = $avgCost / $savingYear;

            $results[] = [
                'key' => $key,
                'label' => $imp['label'],
                'description' => $imp['description'],
                'cost_min' => $imp['cost_min'],
                'cost_max' => $imp['cost_max'],
                'saving_year' => round($savingYear),
                'saving_month' => round($savingYear / 12),
                'payback_years' => round($paybackYears, 1),
            ];
        }

        // Sort by payback period (best first)
        usort($results, fn ($a, $b) => $a['payback_years'] <=> $b['payback_years']);

        return $results;
    }
}