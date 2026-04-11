<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('address_reports', function (Blueprint $table) {
            $table->json('energy_cost_data')->nullable()->after('energy_data');
        });
    }

    public function down(): void
    {
        Schema::table('address_reports', function (Blueprint $table) {
            $table->dropColumn('energy_cost_data');
        });
    }
};