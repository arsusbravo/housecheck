<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('address_reports', function (Blueprint $table) {
            $table->id();
            $table->string('address', 255)->index();
            $table->string('postcode', 10)->index();
            $table->string('city', 255)->nullable();
            $table->string('pdok_id', 255)->nullable()->index();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->text('bag_data')->nullable();
            $table->text('energy_data')->nullable();
            $table->text('soil_data')->nullable();
            $table->text('climate_data')->nullable();
            $table->text('neighborhood_data')->nullable();
            $table->text('raw_responses')->nullable(); // full API responses for debugging
            $table->timestamp('fetched_at');
            $table->timestamps();

            $table->unique(['postcode', 'address']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('address_reports');
    }
};