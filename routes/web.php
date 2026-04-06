<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HuisCheckController;

// HuisCheck as homepage
Route::get('/', [HuisCheckController::class, 'index'])->name('home');
Route::get('/api/suggest', [HuisCheckController::class, 'suggest'])->name('huischeck.suggest');
Route::get('/check', fn () => redirect('/'));
Route::post('/check', [HuisCheckController::class, 'check'])->name('huischeck.check');
Route::get('/report/{id}', [HuisCheckController::class, 'show'])->name('huischeck.show');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';