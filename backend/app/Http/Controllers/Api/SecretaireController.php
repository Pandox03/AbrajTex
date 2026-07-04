<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Container;
use App\Models\Invoice;
use App\Models\Sale;
use Illuminate\Http\JsonResponse;

class SecretaireController extends Controller
{
    public function dashboard(): JsonResponse
    {
        $pendingSales = Sale::with('client')
            ->withCount('invoices')
            ->latest('sale_date')
            ->get()
            ->filter(fn (Sale $sale) => $sale->remainingToInvoice() > 0)
            ->take(5)
            ->values();

        return response()->json([
            'stats' => [
                'containers' => Container::count(),
                'clients' => Client::count(),
                'invoices' => Invoice::count(),
                'sales_without_invoice' => Sale::all()->filter(fn (Sale $s) => $s->remainingToInvoice() > 0)->count(),
                'recent_containers' => Container::where('status', 'arrived')->orWhere('status', 'processing')->count(),
            ],
            'recent_containers' => Container::withCount('items')
                ->latest('arrival_date')
                ->limit(5)
                ->get(),
            'recent_clients' => Client::latest()
                ->limit(5)
                ->get(),
            'pending_invoices' => $pendingSales,
        ]);
    }
}
