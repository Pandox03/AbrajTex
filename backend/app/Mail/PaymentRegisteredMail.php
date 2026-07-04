<?php

namespace App\Mail;

use App\Models\Payment;
use App\Services\BrandAssetService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class PaymentRegisteredMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Payment $payment) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Nouveau paiement — {$this->payment->reference}",
        );
    }

    public function content(): Content
    {
        $brand = app(BrandAssetService::class);
        $clientId = $this->payment->client_id;

        return new Content(
            view: 'emails.payment-registered',
            with: [
                'payment' => $this->payment,
                'methodLabel' => $this->methodLabel(),
                'logoDataUri' => $brand->logoDataUri(),
                'appUrl' => $clientId
                    ? $brand->frontendUrl("clients/{$clientId}")
                    : $brand->frontendUrl('invoices'),
            ],
        );
    }

    /** @return array<int, Attachment> */
    public function attachments(): array
    {
        if (! $this->payment->proof_document) {
            return [];
        }

        $disk = Storage::disk('public');

        if (! $disk->exists($this->payment->proof_document)) {
            return [];
        }

        $filename = basename($this->payment->proof_document);

        return [
            Attachment::fromPath($disk->path($this->payment->proof_document))
                ->as($filename),
        ];
    }

    private function methodLabel(): string
    {
        return match ($this->payment->method) {
            'especes' => 'Espèces',
            'cheque' => 'Chèque',
            'virement' => 'Virement',
            'effet' => 'Effet de commerce',
            default => 'Autre',
        };
    }
}
