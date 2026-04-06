<?php

namespace App\Http\Controllers;

use App\Services\HuisCheck\HuisCheckOrchestrator;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HuisCheckController extends Controller
{
    public function __construct(
        private HuisCheckOrchestrator $orchestrator,
    ) {}

    /**
     * Main search page.
     */
    public function index()
    {
        return Inertia::render('HuisCheck/Index');
    }

    /**
     * Autocomplete endpoint (JSON, no Inertia).
     */
    public function suggest(Request $request)
    {
        $request->validate(['q' => 'required|string|min:2|max:100']);

        $suggestions = $this->orchestrator->suggest($request->q);

        return response()->json($suggestions);
    }

    /**
     * Run the full check and show the report.
     */
    public function check(Request $request)
    {
        $request->validate([
            'pdok_id' => 'required|string',
            'label' => 'nullable|string',
        ]);

        try {
            $report = $this->orchestrator->check($request->pdok_id);

            return Inertia::render('HuisCheck/Report', [
                'report' => $report->summary,
            ]);
        } catch (\RuntimeException $e) {
            return back()->withErrors(['address' => $e->getMessage()]);
        }
    }

    /**
     * View a previously generated report.
     */
    public function show(int $id)
    {
        $report = \App\Models\AddressReport::findOrFail($id);

        return Inertia::render('HuisCheck/Report', [
            'report' => $report->summary,
        ]);
    }
}