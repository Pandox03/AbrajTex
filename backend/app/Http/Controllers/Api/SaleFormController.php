<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\FabricType;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SaleFormController extends Controller
{
    public function __construct(private StockService $stock) {}

    public function formOptions(): JsonResponse
    {
        $data = Cache::remember('sale_form_options', 120, function () {
            return [
                'clients' => Client::query()
                    ->orderBy('name')
                    ->select('id', 'name', 'city', 'category')
                    ->limit(1000)
                    ->get(),
                'fabric_types' => FabricType::query()
                    ->orderBy('name')
                    ->select('id', 'name', 'composition', 'default_width_cm', 'default_gsm', 'parent_id')
                    ->get(),
            ];
        });

        return response()->json($data);
    }

    public function stockAvailability(Request $request): JsonResponse
    {
        $data = $request->validate([
            'fabric_type_id' => ['required', 'exists:fabric_types,id'],
        ]);

        return response()->json($this->stock->availability((int) $data['fabric_type_id']));
    }
}
