<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FabricRoll;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class FabricRollController extends Controller
{
    public function __construct(private StockService $stock) {}

    public function index(Request $request): JsonResponse
    {
        $query = FabricRoll::query()
            ->with(['container', 'fabricType']);

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($containerId = $request->integer('container_id')) {
            $query->where('container_id', $containerId);
        }

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('roll_number', 'like', "%{$search}%")
                    ->orWhere('color_code', 'like', "%{$search}%")
                    ->orWhere('order_number', 'like', "%{$search}%");
            });
        }

        return response()->json($query->latest()->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'container_id' => ['nullable', 'exists:containers,id'],
            'fabric_type_id' => ['required', 'exists:fabric_types,id'],
            'color_code' => ['nullable', 'string', 'max:50'],
            'roll_number' => ['required', 'string', 'max:50'],
            'order_number' => ['nullable', 'string', 'max:100'],
            'origin' => ['nullable', 'string', 'max:100'],
            'width_cm' => ['required', 'integer', 'min:1'],
            'length_m' => ['required', 'numeric', 'min:0.01'],
            'gross_weight_kg' => ['nullable', 'numeric', 'min:0'],
            'net_weight_kg' => ['nullable', 'numeric', 'min:0'],
            'gsm' => ['nullable', 'integer', 'min:1'],
            'composition' => ['nullable', 'string', 'max:150'],
        ]);

        $data['color_code'] = trim($data['color_code'] ?? '') ?: '-';
        $data['quantity_m2'] = FabricRoll::calculateM2($data['width_cm'], $data['length_m']);
        $data['status'] = 'available';

        try {
            $this->stock->assertGlobalStockExists((int) $data['fabric_type_id']);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $roll = FabricRoll::create($data);
        $roll->load(['fabricType', 'container']);

        return response()->json($roll, 201);
    }
}
