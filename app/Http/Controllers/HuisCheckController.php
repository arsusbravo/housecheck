<?php

namespace App\Http\Controllers;

use App\Models\AddressReport;
use App\Services\HuisCheck\HuisCheckOrchestrator;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HuisCheckController extends Controller
{
    public function __construct(
        private HuisCheckOrchestrator $orchestrator,
    ) {}

    public function index()
    {
        return Inertia::render('HuisCheck/Index');
    }

    public function suggest(Request $request)
    {
        $request->validate(['q' => 'required|string|min:2|max:100']);

        return response()->json($this->orchestrator->suggest($request->q));
    }

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

    public function show(int $id)
    {
        $report = AddressReport::findOrFail($id);

        return Inertia::render('HuisCheck/Report', [
            'report' => $report->summary,
        ]);
    }

    /**
     * Compare multiple reports side-by-side.
     */
    public function compare(Request $request)
    {
        $request->validate([
            'ids' => 'required|string',
        ]);

        $ids = array_filter(array_map('intval', explode(',', $request->ids)));

        if (count($ids) < 2) {
            return redirect('/');
        }

        // Cap at 5
        $ids = array_slice($ids, 0, 5);

        $reports = AddressReport::whereIn('id', $ids)
            ->get()
            ->map(fn (AddressReport $r) => $r->summary)
            ->values()
            ->all();

        if (count($reports) < 2) {
            return redirect('/');
        }

        return Inertia::render('HuisCheck/Compare', [
            'reports' => $reports,
        ]);
    }
}