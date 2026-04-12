<?php

namespace App\Services\HuisCheck;

/**
 * Generates a buyer-oriented analysis ("Biedingsrapport") based on all available data.
 * No API calls — pure analysis of already-fetched data.
 */
class BiedingsAnalyseService
{
    /**
     * Generate a full analysis from all report data.
     */
    public function analyse(
        ?array $bagData,
        ?array $energyData,
        ?array $energyCostData,
        ?array $soilData,
        ?array $neighborhoodData,
        ?array $nearbyData,
    ): array {
        $strengths = [];
        $risks = [];
        $letOp = [];
        $score = 50; // Start neutral

        // ── Building Analysis ────────────────────────────────────────────

        $bouwjaar = $bagData['bouwjaar'] ?? null;
        if (is_array($bouwjaar)) $bouwjaar = $bouwjaar[0] ?? null;
        $bouwjaar = $bouwjaar ? (int) $bouwjaar : null;

        $oppervlakte = $bagData['oppervlakte'] ?? null;
        if (is_array($oppervlakte)) $oppervlakte = $oppervlakte[0] ?? null;
        $oppervlakte = $oppervlakte ? (int) $oppervlakte : null;

        if ($bouwjaar) {
            $age = date('Y') - $bouwjaar;

            if ($age <= 5) {
                $strengths[] = ['title' => 'Nieuwbouw', 'detail' => "Gebouwd in {$bouwjaar}. Minimaal onderhoud nodig de komende jaren."];
                $score += 15;
            } elseif ($age <= 15) {
                $strengths[] = ['title' => 'Recent gebouwd', 'detail' => "Gebouwd in {$bouwjaar}. Modern bouwbesluit, goede isolatie waarschijnlijk."];
                $score += 10;
            } elseif ($age <= 30) {
                $strengths[] = ['title' => 'Modern gebouw', 'detail' => "Gebouwd in {$bouwjaar}. Redelijk modern, check staat van onderhoud."];
                $score += 5;
            } elseif ($age <= 50) {
                $risks[] = ['title' => 'Gedateerd gebouw', 'detail' => "Gebouwd in {$bouwjaar} ({$age} jaar oud). Reken op onderhoudskosten voor dak, kozijnen en leidingen."];
                $letOp[] = 'Vraag naar recente renovaties en een bouwkundig rapport.';
                $score -= 5;
            } else {
                $risks[] = ['title' => 'Oud gebouw', 'detail' => "Gebouwd in {$bouwjaar} ({$age} jaar oud). Grote kans op achterstallig onderhoud, mogelijk asbest (bouw vóór 1994), verouderde installaties."];
                $letOp[] = 'Bouwkundige keuring is sterk aan te raden (reken op €300-500).';
                if ($bouwjaar < 1994) {
                    $letOp[] = 'Bouwjaar vóór 1994: laat controleren op asbest (in dak, golfplaten, CV-leidingen).';
                }
                if ($bouwjaar < 1975) {
                    $letOp[] = 'Bouwjaar vóór 1975: mogelijk geen spouwmuren. Isolatie kan kostbaar zijn.';
                }
                $score -= 10;
            }

            // Foundation risk for old buildings in west Netherlands
            if ($bouwjaar < 1970) {
                $letOp[] = 'Bij woningen vóór 1970 in West-Nederland: informeer naar de staat van de fundering (houten palen).';
            }
        }

        // ── Energy Analysis ──────────────────────────────────────────────

        $label = $energyData['label'] ?? null;
        $costMonth = $energyCostData['total']['cost_month'] ?? null;
        $costYear = $energyCostData['total']['cost_year'] ?? null;
        $potentialSaving = $energyCostData['potential_saving_year'] ?? 0;

        if ($label) {
            $goodLabels = ['A+++++', 'A++++', 'A+++', 'A++', 'A+', 'A', 'B'];
            $okLabels = ['C', 'D'];
            $badLabels = ['E', 'F', 'G'];

            if (in_array($label, $goodLabels)) {
                $strengths[] = ['title' => "Energielabel {$label}", 'detail' => 'Energiezuinig. Lage stookkosten en toekomstbestendig bij stijgende energieprijzen.'];
                $score += 10;
            } elseif (in_array($label, $okLabels)) {
                $risks[] = ['title' => "Energielabel {$label}", 'detail' => "Matig energiezuinig. Geschatte energiekosten: €{$costMonth}/maand. Met verduurzaming kun je tot €{$potentialSaving}/jaar besparen."];
                $letOp[] = "Reken verduurzamingskosten mee in je bod. Isolatie en HR++ glas kunnen €5.000-15.000 kosten.";
                $score -= 5;
            } elseif (in_array($label, $badLabels)) {
                $risks[] = ['title' => "Energielabel {$label} — slecht", 'detail' => "Hoge energiekosten: geschat €{$costMonth}/maand (€{$costYear}/jaar). Verduurzaming is vrijwel noodzakelijk."];
                $letOp[] = "Label {$label} = hoge maandlasten. Reken minimaal €10.000-25.000 voor verduurzaming mee in je financiering.";
                $letOp[] = 'Vraag je hypotheekadviseur naar een Energiebespaarhypotheek (extra leenruimte voor verduurzaming).';
                $score -= 15;
            }

            // Expiration check
            $validUntil = $energyData['valid_until'] ?? null;
            if ($validUntil && strtotime($validUntil) < strtotime('+1 year')) {
                $letOp[] = "Het energielabel verloopt binnenkort ({$validUntil}). Een nieuw label kan slechter uitvallen.";
            }
        } else {
            $letOp[] = 'Geen energielabel gevonden. Vraag de verkoper om het energielabel — dit is verplicht bij verkoop.';
        }

        // ── Energy Cost vs Modern Reference ──────────────────────────────

        if ($costYear && $oppervlakte) {
            // Reference: a modern label-A home of same size costs ~€100/month
            $modernCostYear = 1200 + ($oppervlakte * 3); // rough estimate
            $extraCostYear = $costYear - $modernCostYear;

            if ($extraCostYear > 500) {
                $over10Years = $extraCostYear * 10;
                $risks[] = [
                    'title' => 'Hogere energiekosten dan nieuwbouw',
                    'detail' => "Je betaalt geschat €" . round($extraCostYear) . "/jaar meer aan energie dan een vergelijkbaar modern huis. Over 10 jaar is dat €" . number_format($over10Years, 0, ',', '.') . " extra.",
                ];
            }
        }

        // ── Soil Analysis ────────────────────────────────────────────────

        $soilStatus = $soilData['status'] ?? null;

        if ($soilStatus === 'verontreinigd') {
            $risks[] = ['title' => 'Bodemverontreiniging', 'detail' => 'Er is bodemverontreiniging geconstateerd op of nabij deze locatie. Dit kan gevolgen hebben voor de waarde en bouwmogelijkheden.'];
            $letOp[] = 'Vraag de gemeente naar de actuele bodemdossiers en eventuele saneringsplicht.';
            $score -= 15;
        } elseif ($soilStatus === 'schoon' || $soilStatus === 'onderzocht') {
            $strengths[] = ['title' => 'Bodem schoon', 'detail' => 'Geen bekende bodemverontreiniging op deze locatie.'];
            $score += 5;
        }

        // ── Neighborhood Analysis ────────────────────────────────────────

        $population = $neighborhoodData['population'] ?? null;
        $density = $neighborhoodData['population_density'] ?? null;
        $avgIncome = $neighborhoodData['avg_income'] ?? null;
        $avgWoz = $neighborhoodData['avg_property_value'] ?? null;

        if ($avgIncome && $avgIncome > 35000) {
            $strengths[] = ['title' => 'Bovengemiddeld inkomen in de buurt', 'detail' => "Gemiddeld inkomen: €" . number_format($avgIncome, 0, ',', '.') . "/jaar. Dit duidt op een stabiele, koopkrachtige buurt."];
            $score += 5;
        }

        if ($avgWoz && $avgWoz > 0) {
            $strengths[] = ['title' => 'WOZ-referentie beschikbaar', 'detail' => "Gemiddelde WOZ-waarde in deze buurt: €" . number_format($avgWoz, 0, ',', '.') . ". Gebruik dit als referentie bij je bod."];
        }

        // ── Nearby Amenities Analysis ────────────────────────────────────

        if ($nearbyData) {
            $nearScore = 0;

            $super = $nearbyData['supermarket']['nearest_distance_m'] ?? null;
            $school = $nearbyData['school']['nearest_distance_m'] ?? null;
            $doctor = $nearbyData['doctor']['nearest_distance_m'] ?? null;
            $station = $nearbyData['station']['nearest_distance_m'] ?? null;
            $park = $nearbyData['park']['nearest_distance_m'] ?? null;

            if ($super && $super < 800) $nearScore++;
            if ($school && $school < 1000) $nearScore++;
            if ($doctor && $doctor < 1500) $nearScore++;
            if ($station && $station < 1500) $nearScore++;
            if ($park && $park < 1000) $nearScore++;

            if ($nearScore >= 4) {
                $strengths[] = ['title' => 'Uitstekende voorzieningen', 'detail' => 'Supermarkt, school, huisarts, OV en groen allemaal op loop-/fietsafstand. Zeer gewild bij gezinnen.'];
                $score += 10;
            } elseif ($nearScore >= 2) {
                $strengths[] = ['title' => 'Goede voorzieningen', 'detail' => 'De belangrijkste voorzieningen zijn in de buurt aanwezig.'];
                $score += 5;
            } elseif ($nearScore <= 1) {
                $risks[] = ['title' => 'Beperkte voorzieningen', 'detail' => 'Weinig basisvoorzieningen op loopafstand. Auto is waarschijnlijk noodzakelijk.'];
                $score -= 5;
            }

            // Station proximity is a value driver
            if ($station && $station < 800) {
                $strengths[] = ['title' => 'Dichtbij OV', 'detail' => "Treinstation op {$station}m. Goede bereikbaarheid verhoogt de waarde."];
                $score += 5;
            }
        }

        // ── Compose Final Verdict ────────────────────────────────────────

        $score = max(0, min(100, $score));

        $verdict = match (true) {
            $score >= 75 => [
                'level' => 'positief',
                'title' => 'Overwegend positief',
                'summary' => 'Deze woning scoort goed op de belangrijkste punten. Let op de aandachtspunten hieronder.',
            ],
            $score >= 50 => [
                'level' => 'neutraal',
                'title' => 'Gemengd beeld',
                'summary' => 'Deze woning heeft sterke en zwakke punten. Weeg de aandachtspunten zorgvuldig mee in je bod.',
            ],
            $score >= 30 => [
                'level' => 'voorzichtig',
                'title' => 'Wees voorzichtig',
                'summary' => 'Er zijn meerdere aandachtspunten. Overweeg extra onderzoek en reken verborgen kosten mee.',
            ],
            default => [
                'level' => 'negatief',
                'title' => 'Veel aandachtspunten',
                'summary' => 'Deze woning heeft significante risico\'s. Laat je goed adviseren vóór je een bod uitbrengt.',
            ],
        };

        // Standard let-op items every buyer should know
        if (empty($letOp)) {
            $letOp[] = 'Controleer altijd het bestemmingsplan bij de gemeente voor bouw- of verbouwplannen.';
        }
        $letOp[] = 'Vraag de verkoper naar het eigendomsbewijs en eventuele erfdienstbaarheden.';
        $letOp[] = 'Neem altijd een ontbindende voorwaarde op voor financiering én bouwkundige keuring.';

        return [
            'score' => $score,
            'verdict' => $verdict,
            'strengths' => $strengths,
            'risks' => $risks,
            'let_op' => array_unique($letOp),
        ];
    }
}