<?php

namespace App\Console\Commands;

use App\Services\HuisCheck\BagService;
use App\Services\HuisCheck\BodemService;
use App\Services\HuisCheck\CbsService;
use App\Services\HuisCheck\EpOnlineService;
use App\Services\HuisCheck\KlimaatService;
use App\Services\HuisCheck\PdokService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class HuisCheckDebug extends Command
{
    protected $signature = 'huischeck:debug {address=Ravelstraat 29 Capelle aan den IJssel}';
    protected $description = 'Test all HuisCheck services and show raw responses';

    public function handle(): void
    {
        $address = $this->argument('address');
        $this->info("Testing: {$address}");
        $this->newLine();

        // 1. PDOK
        $this->info('=== PDOK Suggest ===');
        $pdok = app(PdokService::class);
        $suggestions = $pdok->suggest($address);
        if (empty($suggestions)) {
            $this->error('No suggestions found');
            return;
        }
        $this->line("Found: {$suggestions[0]['label']}");

        $location = $pdok->lookup($suggestions[0]['id']);
        $this->table(['Key', 'Value'], collect($location)->map(fn ($v, $k) => [$k, $v])->values()->all());

        $lat = $location['lat'];
        $lng = $location['lng'];
        $postcode = $location['postcode'];
        $houseNumber = $location['house_number'];

        // 2. BAG
        $this->newLine();
        $this->info('=== BAG (spatial) ===');
        $bag = app(BagService::class)->getByCoordinates($lat, $lng);
        $this->line(json_encode($bag, JSON_PRETTY_PRINT));

        // 3. EP-Online
        $this->newLine();
        $this->info('=== EP-Online ===');
        $energy = app(EpOnlineService::class)->getByAddress($postcode, $houseNumber);
        $this->line(json_encode($energy, JSON_PRETTY_PRINT));

        // 4. Bodemloket - test raw response
        $this->newLine();
        $this->info('=== Bodemloket (raw) ===');
        $buffer = 0.0005;
        $bbox = ($lat - $buffer).','.($lng - $buffer).','.($lat + $buffer).','.($lng + $buffer);
        $r = Http::timeout(15)->get('https://gis.gdngeoservices.nl/standalone/services/blk_gdn/lks_blk_rd_v1/MapServer/WMSServer', [
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
        $this->line("Status: {$r->status()}");
        $this->line("Content-Type: " . ($r->header('Content-Type') ?? 'unknown'));
        $this->line("Body (first 500): " . substr($r->body(), 0, 500));

        // Also test parsed
        $this->newLine();
        $this->info('=== Bodemloket (parsed) ===');
        $bodem = app(BodemService::class)->getByCoordinates($lat, $lng);
        $this->line(json_encode($bodem, JSON_PRETTY_PRINT));

        // 5. CBS - test raw WFS response
        $this->newLine();
        $this->info('=== CBS WFS (raw) ===');
        $rd = $this->wgs84ToRd($lat, $lng);
        $this->line("RD coords: x={$rd['x']}, y={$rd['y']}");
        $bboxRd = ($rd['x']-10).','.($rd['y']-10).','.($rd['x']+10).','.($rd['y']+10);
        $r = Http::timeout(15)->get('https://service.pdok.nl/cbs/wijkenbuurten/2024/wfs/v1_0', [
            'service' => 'WFS',
            'version' => '2.0.0',
            'request' => 'GetFeature',
            'typeName' => 'wijkenbuurten:buurten',
            'outputFormat' => 'application/json',
            'bbox' => $bboxRd,
            'count' => 1,
        ]);
        $this->line("Status: {$r->status()}");
        $this->line("Body (first 1000): " . substr($r->body(), 0, 1000));

        // Also show all property names if we got a feature
        $props = $r->json('features.0.properties');
        if ($props) {
            $this->newLine();
            $this->info('=== CBS Property Names & Values ===');
            foreach ($props as $key => $value) {
                if ($value !== null && $value !== '' && $value !== -99999999) {
                    $this->line("  {$key} => {$value}");
                }
            }
        }

        // Also test parsed
        $this->newLine();
        $this->info('=== CBS (parsed) ===');
        $cbs = app(CbsService::class)->getByCoordinates($lat, $lng);
        $this->line(json_encode($cbs, JSON_PRETTY_PRINT));

        // 6. Klimaat
        $this->newLine();
        $this->info('=== Klimaat ===');
        $klimaat = app(KlimaatService::class)->getByCoordinates($lat, $lng);
        $this->line(json_encode($klimaat, JSON_PRETTY_PRINT));
    }

    private function wgs84ToRd(float $lat, float $lng): array
    {
        $dLat = 0.36 * ($lat - 52.15517);
        $dLng = 0.36 * ($lng - 5.38721);
        $x = 155000 + (190094.945 * $dLng) + (-11832.228 * $dLat * $dLng) + (-114.221 * $dLat * $dLat * $dLng);
        $y = 463000 + (309056.544 * $dLat) + (3638.893 * $dLng * $dLng) + (72.971 * $dLat * $dLat);
        return ['x' => round($x, 2), 'y' => round($y, 2)];
    }
}