<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Sale;
use App\Services\ActivityLogger;
use App\Services\AdminNotificationService;
use App\Services\BillingService;
use App\Services\InvoicePdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response;

class InvoiceController extends Controller
{
    public function __construct(
        private BillingService $billing,
        private ActivityLogger $logger,
        private InvoicePdfService $pdf,
        private AdminNotificationService $adminNotifications,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Invoice::query()->with(['client', 'sale']);

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                    ->orWhereHas('client', fn ($c) => $c->where('name', 'like', "%{$search}%"));
            });
        }

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($clientId = $request->integer('client_id')) {
            $query->where('client_id', $clientId);
        }

        if ($from = $request->string('date_from')->toString()) {
            $query->whereDate('invoice_date', '>=', $from);
        }

        if ($to = $request->string('date_to')->toString()) {
            $query->whereDate('invoice_date', '<=', $to);
        }

        return response()->json($query->latest('invoice_date')->paginate(20));
    }

    public function salesForInvoice(): JsonResponse
    {
        $sales = Sale::query()
            ->with(['client', 'items', 'invoices'])
            ->withCount('invoices')
            ->latest('sale_date')
            ->get()
            ->map(fn (Sale $sale) => array_merge($sale->toArray(), [
                'invoiced_total' => $sale->invoicedTotal(),
                'invoiced_subtotal' => $sale->invoicedSubtotal(),
                'remaining_to_invoice' => $sale->remainingToInvoice(),
            ]));

        return response()->json($sales);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sale_id' => ['required', 'exists:sales,id'],
            'amount' => ['nullable', 'numeric', 'min:0.01'],
            'invoice_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $sale = Sale::with(['client', 'invoices'])->findOrFail($data['sale_id']);

        try {
            $invoice = $this->billing->createInvoiceForSale(
                $sale,
                isset($data['amount']) ? (float) $data['amount'] : null,
            );
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        if (! empty($data['invoice_date'])) {
            $invoice->invoice_date = $data['invoice_date'];
        }
        if (! empty($data['due_date'])) {
            $invoice->due_date = $data['due_date'];
        }
        if (! empty($data['notes'])) {
            $invoice->notes = $data['notes'];
        }
        $invoice->save();

        $invoice->load(['client', 'sale.items.fabricType', 'sale.items.fabricRoll.fabricType']);

        $this->logger->log(
            $request->user(),
            $request,
            'created',
            "Facture générée — {$invoice->reference}",
            'invoice',
            $invoice->id,
            ['sale' => $sale->reference],
        );

        $this->adminNotifications->notifyInvoiceRegistered($invoice);

        return response()->json($invoice, 201);
    }

    public function show(Invoice $invoice): JsonResponse
    {
        $invoice->load([
            'client',
            'sale.items.fabricType',
            'sale.items.fabricRoll.fabricType',
            'sale.items.fabricRoll.container',
            'payments',
        ]);

        return response()->json($invoice);
    }

    public function update(Request $request, Invoice $invoice): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:sent,paid,unpaid'],
        ]);

        $invoice->update(['status' => $data['status']]);

        $this->logger->log(
            $request->user(),
            $request,
            'updated',
            "Statut facture — {$invoice->reference} → {$data['status']}",
            'invoice',
            $invoice->id,
        );

        $invoice->load(['client', 'sale']);

        return response()->json($invoice);
    }

    public function downloadPdf(Invoice $invoice): Response
    {
        return $this->pdf->generate($invoice)->download("{$invoice->reference}.pdf");
    }
}
