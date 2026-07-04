<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FabricRoll;
use App\Models\FabricType;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockController extends Controller
{
    public function __construct(private StockService $stock) {}

    public function index(Request $request): JsonResponse
    {
        $lines = collect($this->stock->globalStockLines());

        if ($search = $request->string('search')->toString()) {
            $searchLower = mb_strtolower($search);
            $fabricTypeIds = FabricType::query()
                ->where('name', 'like', "%{$search}%")
                ->pluck('id');

            $lines = $lines->filter(fn (array $line) => $fabricTypeIds->contains($line['fabric_type_id']));
        }

        if ($fabricTypeId = $request->integer('fabric_type_id')) {
            $lines = $lines->where('fabric_type_id', $fabricTypeId);
        }

        $fabricTypes = FabricType::query()
            ->whereIn('id', $lines->pluck('fabric_type_id')->unique())
            ->get()
            ->keyBy('id');

        $items = $lines->map(function (array $line) use ($fabricTypes) {
            return [
                'fabric_type_id' => $line['fabric_type_id'],
                'fabric_type' => $fabricTypes->get($line['fabric_type_id']),
                'quantity_m2' => $line['total_m2'],
                'sold_m2' => $line['sold_m2'],
                'available_m2' => $line['available_m2'],
                'total_rolls' => $line['total_rolls'],
                'available_rolls' => $line['available_rolls'],
                'sold_rolls' => $line['sold_rolls'],
            ];
        })->values();

        $page = max(1, $request->integer('page', 1));
        $perPage = 20;
        $total = $items->count();
        $paginated = $items->slice(($page - 1) * $perPage, $perPage)->values();

        return response()->json([
            'summary' => $this->stock->globalSummary(),
            'items' => [
                'data' => $paginated,
                'current_page' => $page,
                'last_page' => max(1, (int) ceil($total / $perPage)),
                'per_page' => $perPage,
                'total' => $total,
            ],
        ]);
    }

    public function rolls(Request $request): JsonResponse
    {
        $query = FabricRoll::query()
            ->with(['container', 'fabricType', 'sale.client']);

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($fabricTypeId = $request->integer('fabric_type_id')) {
            $query->where('fabric_type_id', $fabricTypeId);
        }

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('roll_number', 'like', "%{$search}%")
                    ->orWhereHas('fabricType', fn ($t) => $t->where('name', 'like', "%{$search}%"));
            });
        }

        return response()->json($query->latest()->paginate(25));
    }
}
