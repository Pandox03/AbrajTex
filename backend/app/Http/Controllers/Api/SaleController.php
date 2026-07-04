<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FabricRoll;
use App\Models\FabricType;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Services\ActivityLogger;
use App\Services\BillingService;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class SaleController extends Controller
{
    public function __construct(
        private BillingService $billing,
        private ActivityLogger $logger,
        private StockService $stock,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Sale::query()->with(['client', 'invoices', 'items']);

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                    ->orWhereHas('client', fn ($c) => $c->where('name', 'like', "%{$search}%"));
            });
        }

        if ($clientId = $request->integer('client_id')) {
            $query->where('client_id', $clientId);
        }

        if ($paymentStatus = $request->string('payment_status')->toString()) {
            $query->where('payment_status', $paymentStatus);
        }

        if ($from = $request->string('date_from')->toString()) {
            $query->whereDate('sale_date', '>=', $from);
        }

        if ($to = $request->string('date_to')->toString()) {
            $query->whereDate('sale_date', '<=', $to);
        }

        return response()->json($query->latest('sale_date')->paginate(15));
    }

    public function show(Sale $sale): JsonResponse
    {
        $sale->load([
            'client',
            'invoices.payments',
            'payments',
            'items.fabricRoll.fabricType',
            'items.fabricRoll.container',
        ]);

        $sale->balance_due = $sale->balanceDue();

        return response()->json($sale);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'reference' => ['required', 'string', 'max:100', 'unique:sales,reference'],
            'client_id' => ['required', 'exists:clients,id'],
            'sale_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.fabric_type_id' => ['required', 'exists:fabric_types,id'],
            'lines.*.roll_count' => ['required', 'integer', 'min:1'],
            'lines.*.quantity_m2' => ['required', 'numeric', 'min:0.01'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        try {
            $sale = DB::transaction(function () use ($data, $request) {
                $this->stock->assertSufficientStockForSaleLines($data['lines']);

                $sale = Sale::create([
                    'reference' => $data['reference'],
                    'client_id' => $data['client_id'],
                    'sale_date' => $data['sale_date'],
                    'notes' => $data['notes'] ?? null,
                    'user_id' => $request->user()->id,
                    'total_amount' => 0,
                    'paid_amount' => 0,
                    'payment_status' => 'unpaid',
                ]);

                $total = 0;
                $rollSequence = 0;

                foreach ($data['lines'] as $lineIndex => $lineData) {
                    $fabricType = FabricType::query()->findOrFail($lineData['fabric_type_id']);
                    $lineM2 = round((float) $lineData['quantity_m2'], 2);
                    $rollCount = (int) $lineData['roll_count'];
                    $widthCm = (int) ($fabricType->default_width_cm ?? 150);
                    $baseM2PerRoll = floor(($lineM2 / $rollCount) * 100) / 100;
                    $m2Assigned = 0.0;

                    for ($i = 1; $i <= $rollCount; $i++) {
                        $rollSequence++;
                        $rollNumber = sprintf('%s-R%03d', $data['reference'], $rollSequence);
                        $m2ForRoll = $i === $rollCount
                            ? round($lineM2 - $m2Assigned, 2)
                            : $baseM2PerRoll;
                        $m2Assigned += $m2ForRoll;

                        $lengthM = $widthCm > 0
                            ? round($m2ForRoll / ($widthCm / 100), 2)
                            : 50;

                        $roll = FabricRoll::create([
                            'container_id' => null,
                            'fabric_type_id' => $fabricType->id,
                            'color_code' => '-',
                            'roll_number' => $rollNumber,
                            'width_cm' => $widthCm,
                            'length_m' => $lengthM,
                            'quantity_m2' => $m2ForRoll,
                            'gsm' => $fabricType->default_gsm,
                            'composition' => $fabricType->composition,
                            'status' => 'sold',
                            'sale_id' => $sale->id,
                            'sold_at' => now(),
                        ]);

                        $lineTotal = round($lineData['unit_price'] * $m2ForRoll, 2);

                        SaleItem::create([
                            'sale_id' => $sale->id,
                            'fabric_roll_id' => $roll->id,
                            'unit_price' => $lineData['unit_price'],
                            'quantity_m2' => $m2ForRoll,
                            'line_total' => $lineTotal,
                        ]);

                        $total += $lineTotal;
                    }
                }

                $sale->update(['total_amount' => $total]);

                return $sale;
            });

            $sale->load(['client', 'items.fabricRoll.fabricType', 'invoices']);

            $this->logger->log(
                $request->user(),
                $request,
                'created',
                "Vente enregistrée — {$sale->reference}",
                'sale',
                $sale->id,
                ['client' => $sale->client?->name, 'total' => $sale->total_amount],
            );

            return response()->json($sale, 201);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
