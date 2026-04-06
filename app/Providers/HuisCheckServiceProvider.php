<?php

namespace App\Providers;

use App\Services\HuisCheck\HuisCheckOrchestrator;
use Illuminate\Support\ServiceProvider;

class HuisCheckServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // All services are simple classes with no special constructor args,
        // so Laravel's container can auto-resolve them.
        // We register the orchestrator as a singleton to avoid
        // re-instantiating all 6 services on every call.
        $this->app->singleton(HuisCheckOrchestrator::class);
    }

    public function boot(): void
    {
        $this->mergeConfigFrom(
            base_path('config/huischeck.php'),
            'huischeck'
        );
    }
}