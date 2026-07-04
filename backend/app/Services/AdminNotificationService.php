<?php

namespace App\Services;

use App\Mail\InvoiceRegisteredMail;
use App\Mail\PaymentRegisteredMail;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class AdminNotificationService
{
    public function notifyInvoiceRegistered(Invoice $invoice): void
    {
        $invoice->loadMissing(['client', 'sale']);

        foreach ($this->adminRecipients() as $admin) {
            try {
                Mail::to($admin->email)->send(new InvoiceRegisteredMail($invoice));
            } catch (Throwable $e) {
                Log::warning('Échec envoi e-mail facture aux admins', [
                    'invoice_id' => $invoice->id,
                    'admin_email' => $admin->email,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    public function notifyPaymentRegistered(Payment $payment): void
    {
        $payment->loadMissing(['client', 'invoice.sale']);

        foreach ($this->adminRecipients() as $admin) {
            try {
                Mail::to($admin->email)->send(new PaymentRegisteredMail($payment));
            } catch (Throwable $e) {
                Log::warning('Échec envoi e-mail paiement aux admins', [
                    'payment_id' => $payment->id,
                    'admin_email' => $admin->email,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /** @return Collection<int, User> */
    private function adminRecipients(): Collection
    {
        return User::query()
            ->where('role', 'admin')
            ->whereNotNull('email')
            ->get();
    }
}
