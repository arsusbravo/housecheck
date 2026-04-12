<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('address_reports', function (Blueprint $table) {
            $table->text('analyse_data')->nullable()->after('nearby_data');
        });
    }

    public function down(): void
    {
        Schema::table('address_reports', function (Blueprint $table) {
            $table->dropColumn('analyse_data');
        });
    }
};