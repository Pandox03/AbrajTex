<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;

class ComptableController extends Controller
{
    public function dashboard(): JsonResponse
    {
        $totalInvoiced = (float) Invoice::sum('total');
        $totalPaid = (float) Payment::where('status', 'confirmed')->sum('amount');
        $unpaidCount = Invoice::whereIn('status', ['unpaid', 'sent'])->count();

        return response()->json([
            'stats' => [
                'invoices' => Invoice::count(),
                'payments' => Payment::where('status', 'confirmed')->count(),
                'total_invoiced' => round($totalInvoiced, 2),
                'total_paid' => round($totalPaid, 2),
                'balance_due' => round(max(0, $totalInvoiced - $totalPaid), 2),
                'unpaid_invoices' => $unpaidCount,
            ],
            'recent_invoices' => Invoice::with(['client', 'sale'])
                ->latest('invoice_date')
                ->limit(5)
                ->get(),
            'recent_payments' => Payment::with(['client', 'invoice'])
                ->where('status', 'confirmed')
                ->latest('payment_date')
                ->limit(5)
                ->get(),
        ]);
    }
}
