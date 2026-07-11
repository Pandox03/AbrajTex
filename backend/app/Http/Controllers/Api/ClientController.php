<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Services\ActivityLogger;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ClientController extends Controller
{
    public function __construct(
        private BillingService $billing,
        private ActivityLogger $logger,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Client::query();

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('ice_number', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%");
            });
        }

        if ($city = $request->string('city')->toString()) {
            $query->where('city', $city);
        }

        if ($category = $request->string('category')->toString()) {
            $query->where('category', $category);
        }

        if ($request->boolean('lite')) {
            $clients = $query
                ->orderBy('name')
                ->select('id', 'name', 'city', 'category')
                ->limit(min($request->integer('limit', 500), 1000))
                ->get();

            return response()->json($clients);
        }

        $clients = $query->withCount('sales')->orderBy('name')->paginate(20);

        $stats = $this->billing->clientListStats($clients->getCollection());

        $clients->getCollection()->transform(function (Client $client) use ($stats) {
            $balance = $stats[$client->id] ?? [
                'orders_count' => 0,
                'total_sales' => 0,
                'balance_due' => 0,
            ];

            return array_merge($client->toArray(), $balance);
        });

        return response()->json($clients);
    }

    public function show(Client $client): JsonResponse
    {
        $client->loadCount('sales', 'payments', 'invoices');

        $balance = $this->billing->clientBalance($client);

        $sales = $client->sales()
            ->with(['invoice', 'items'])
            ->latest('sale_date')
            ->limit(50)
            ->get();

        $payments = $client->payments()
            ->with(['invoice.sale'])
            ->latest('payment_date')
            ->limit(50)
            ->get()
            ->map(function ($payment) {
                $data = $payment->toArray();
                $data['proof_document_url'] = $payment->proof_document
                    ? url("/api/payments/{$payment->id}/proof")
                    : null;

                return $data;
            });

        $allocations = $this->billing->fifoInvoiceAllocations($client);

        $invoices = $client->invoices()
            ->with('sale')
            ->latest('invoice_date')
            ->limit(50)
            ->get()
            ->map(fn ($invoice) => array_merge($invoice->toArray(), [
                'paid_amount' => $allocations[$invoice->id] ?? 0,
                'remaining_to_pay' => round(max(0, (float) $invoice->total - ($allocations[$invoice->id] ?? 0)), 2),
            ]));

        return response()->json([
            'client' => $client,
            'balance' => $balance,
            'sales' => $sales,
            'payments' => $payments,
            'invoices' => $invoices,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'contact_person' => ['nullable', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:150'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:100'],
            'ice_number' => ['nullable', 'string', 'max:50'],
            'credit_limit' => ['nullable', 'numeric', 'min:0'],
            'payment_terms_days' => ['nullable', 'integer', 'min:0', 'max:365'],
            'notes' => ['nullable', 'string'],
        ]);

        $client = Client::create($data);

        Cache::forget('sale_form_options');

        $this->logger->log(
            $request->user(),
            $request,
            'created',
            "Client créé — {$client->name}",
            'client',
            $client->id,
        );

        return response()->json($client, 201);
    }

    public function update(Request $request, Client $client): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:150'],
            'contact_person' => ['nullable', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:150'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:100'],
            'ice_number' => ['nullable', 'string', 'max:50'],
            'credit_limit' => ['nullable', 'numeric', 'min:0'],
            'payment_terms_days' => ['nullable', 'integer', 'min:0', 'max:365'],
            'notes' => ['nullable', 'string'],
        ]);

        $client->update($data);

        Cache::forget('sale_form_options');

        $this->logger->log(
            $request->user(),
            $request,
            'updated',
            "Client modifié — {$client->name}",
            'client',
            $client->id,
        );

        return response()->json($client);
    }

    public function destroy(Request $request, Client $client): JsonResponse
    {
        $name = $client->name;
        $id = $client->id;

        $client->delete();

        $this->logger->log(
            $request->user(),
            $request,
            'deleted',
            "Client supprimé — {$name}",
            'client',
            $id,
        );

        return response()->json(null, 204);
    }
}
