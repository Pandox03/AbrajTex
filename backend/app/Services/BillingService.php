<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Sale;
use InvalidArgumentException;

class BillingService
{
    public const DEFAULT_TAX_RATE = 20.0;

    /** @var array<int, array<int, float>> */
    private array $fifoCache = [];

    /**
     * Split a TTC amount into HT, TVA and TTC (amounts are tax-inclusive).
     *
     * @return array{subtotal: float, tax_rate: float, tax_amount: float, total: float}
     */
    public function splitTtc(float $amountTtc, float $taxRate = self::DEFAULT_TAX_RATE): array
    {
        $amountTtc = round(max(0, $amountTtc), 2);
        $ht = round($amountTtc / (1 + ($taxRate / 100)), 2);
        $tax = round($amountTtc - $ht, 2);

        return [
            'subtotal' => $ht,
            'tax_rate' => $taxRate,
            'tax_amount' => $tax,
            'total' => $amountTtc,
        ];
    }

    public function htFromTtc(float $amountTtc, float $taxRate = self::DEFAULT_TAX_RATE): float
    {
        return $this->splitTtc($amountTtc, $taxRate)['subtotal'];
    }

    public function createInvoiceForSale(Sale $sale, ?float $amountTtc = null): Invoice
    {
        $client = $sale->client;
        $amountTtc = $amountTtc ?? $sale->remainingToInvoice();

        if ($amountTtc <= 0) {
            throw new InvalidArgumentException('Aucun montant restant à facturer pour cette vente.');
        }

        if ($amountTtc > $sale->remainingToInvoice() + 0.01) {
            throw new InvalidArgumentException('Le montant dépasse le reste à facturer sur cette vente.');
        }

        $breakdown = $this->splitTtc($amountTtc);

        return Invoice::create([
            'sale_id' => $sale->id,
            'client_id' => $sale->client_id,
            'reference' => $this->nextInvoiceReference(),
            'invoice_date' => $sale->sale_date,
            'due_date' => $sale->sale_date->copy()->addDays($client->payment_terms_days ?? 30),
            'subtotal' => $breakdown['subtotal'],
            'tax_rate' => $breakdown['tax_rate'],
            'tax_amount' => $breakdown['tax_amount'],
            'total' => $breakdown['total'],
            'status' => 'sent',
        ]);
    }

    /**
     * Allocate confirmed client payments to invoices (FIFO by invoice date).
     *
     * @return array<int, float> invoice_id => allocated amount
     */
    public function fifoInvoiceAllocations(Client $client, bool $refresh = false): array
    {
        if (! $refresh && isset($this->fifoCache[$client->id])) {
            return $this->fifoCache[$client->id];
        }

        $payments = Payment::query()
            ->where('client_id', $client->id)
            ->where('status', 'confirmed')
            ->orderBy('payment_date')
            ->orderBy('id')
            ->get();

        $invoices = Invoice::query()
            ->where('client_id', $client->id)
            ->orderBy('invoice_date')
            ->orderBy('id')
            ->get();

        $allocations = [];
        $remainingByInvoice = [];

        foreach ($invoices as $invoice) {
            $allocations[$invoice->id] = 0.0;
            $remainingByInvoice[$invoice->id] = (float) $invoice->total;
        }

        foreach ($payments as $payment) {
            $left = (float) $payment->amount;

            foreach ($invoices as $invoice) {
                if ($left <= 0.001) {
                    break;
                }

                $canApply = min($left, $remainingByInvoice[$invoice->id]);

                if ($canApply <= 0) {
                    continue;
                }

                $allocations[$invoice->id] += $canApply;
                $remainingByInvoice[$invoice->id] -= $canApply;
                $left -= $canApply;
            }
        }

        foreach ($allocations as $invoiceId => $amount) {
            $allocations[$invoiceId] = round($amount, 2);
        }

        $this->fifoCache[$client->id] = $allocations;

        return $allocations;
    }

    public function invoicePaidAmount(Invoice $invoice, ?array $allocations = null): float
    {
        $allocations ??= $this->fifoInvoiceAllocations($invoice->client);

        return round((float) ($allocations[$invoice->id] ?? 0), 2);
    }

    public function invoiceRemainingToPay(Invoice $invoice, ?array $allocations = null): float
    {
        return round(max(0, (float) $invoice->total - $this->invoicePaidAmount($invoice, $allocations)), 2);
    }

    public function applyPayment(Payment $payment): void
    {
        if ($payment->status !== 'confirmed') {
            return;
        }

        $client = $payment->client ?? Client::find($payment->client_id);

        if (! $client) {
            return;
        }

        $this->syncClientBilling($client);
    }

    public function syncClientBilling(Client $client): void
    {
        unset($this->fifoCache[$client->id]);

        $allocations = $this->fifoInvoiceAllocations($client, true);

        $invoices = Invoice::query()->where('client_id', $client->id)->get();

        foreach ($invoices as $invoice) {
            $this->syncInvoiceStatus($invoice, $allocations);
        }

        $saleIds = $invoices->pluck('sale_id')->filter()->unique();

        foreach (Sale::query()->whereIn('id', $saleIds)->get() as $sale) {
            $this->syncSaleFromInvoices($sale, $allocations);
        }
    }

    public function syncInvoiceStatus(Invoice $invoice, ?array $allocations = null): void
    {
        $paid = $this->invoicePaidAmount($invoice, $allocations);
        $total = (float) $invoice->total;

        if ($paid >= $total - 0.01) {
            $invoice->update(['status' => 'paid']);

            return;
        }

        if ($paid > 0) {
            $invoice->update(['status' => 'unpaid']);
        }
    }

    public function syncSaleFromInvoices(?Sale $sale, ?array $allocations = null): void
    {
        if (! $sale) {
            return;
        }

        $sale->loadMissing('invoices', 'client');

        $paid = 0.0;

        foreach ($sale->invoices as $invoice) {
            $paid += $this->invoicePaidAmount($invoice, $allocations);
        }

        $total = (float) $sale->total_amount;
        $status = match (true) {
            $paid <= 0 => 'unpaid',
            $paid < $total - 0.01 => 'partial',
            default => 'paid',
        };

        $sale->update([
            'paid_amount' => round($paid, 2),
            'payment_status' => $status,
        ]);
    }

    public function validateClientPaymentAmount(Client $client, float $amount): void
    {
        $balance = $this->clientBalance($client);

        if ($amount <= 0) {
            throw new InvalidArgumentException('Le montant doit être supérieur à zéro.');
        }

        if ($amount > $balance['balance_due'] + 0.01) {
            throw new InvalidArgumentException(
                "Le montant dépasse le solde dû du client ({$balance['balance_due']} MAD)."
            );
        }
    }

    /** @deprecated Use validateClientPaymentAmount() */
    public function validatePaymentAmount(Invoice $invoice, float $amount): void
    {
        $this->validateClientPaymentAmount($invoice->client, $amount);
    }

    public function clientBalance(Client $client): array
    {
        $totalInvoiced = (float) $client->invoices()->sum('total');
        $totalPaid = (float) Payment::query()
            ->where('client_id', $client->id)
            ->where('status', 'confirmed')
            ->sum('amount');
        $totalSales = (float) $client->sales()->sum('total_amount');

        return [
            'total_invoiced' => round($totalInvoiced, 2),
            'total_sales' => round($totalSales, 2),
            'total_paid' => round($totalPaid, 2),
            'balance_due' => round(max(0, $totalInvoiced - $totalPaid), 2),
            'orders_count' => $client->sales()->count(),
        ];
    }

    /**
     * @param  iterable<int, Client>  $clients
     * @return array<int, array{orders_count: int, total_sales: float, balance_due: float}>
     */
    public function clientListStats(iterable $clients): array
    {
        $ids = collect($clients)->pluck('id')->filter()->values()->all();

        if ($ids === []) {
            return [];
        }

        $salesRows = Sale::query()
            ->whereIn('client_id', $ids)
            ->selectRaw('client_id')
            ->selectRaw('COUNT(*) as orders_count')
            ->selectRaw('COALESCE(SUM(total_amount), 0) as total_sales')
            ->groupBy('client_id')
            ->get()
            ->keyBy('client_id');

        $invoiceRows = Invoice::query()
            ->whereIn('client_id', $ids)
            ->selectRaw('client_id')
            ->selectRaw('COALESCE(SUM(total), 0) as total_invoiced')
            ->groupBy('client_id')
            ->get()
            ->keyBy('client_id');

        $paidRows = Payment::query()
            ->whereIn('client_id', $ids)
            ->where('status', 'confirmed')
            ->selectRaw('client_id')
            ->selectRaw('COALESCE(SUM(amount), 0) as total_paid')
            ->groupBy('client_id')
            ->get()
            ->keyBy('client_id');

        $stats = [];

        foreach ($ids as $id) {
            $sales = $salesRows->get($id);
            $invoiced = (float) ($invoiceRows->get($id)?->total_invoiced ?? 0);
            $paid = (float) ($paidRows->get($id)?->total_paid ?? 0);

            $stats[$id] = [
                'orders_count' => (int) ($sales->orders_count ?? 0),
                'total_sales' => round((float) ($sales->total_sales ?? 0), 2),
                'balance_due' => round(max(0, $invoiced - $paid), 2),
            ];
        }

        return $stats;
    }

    private function nextInvoiceReference(): string
    {
        $year = now()->format('Y');
        $last = Invoice::where('reference', 'like', "FAC-{$year}-%")
            ->orderByDesc('reference')
            ->value('reference');

        $seq = $last ? ((int) substr($last, -4)) + 1 : 1;

        return sprintf('FAC-%s-%04d', $year, $seq);
    }
}
