<?php

namespace App\Mail;

use App\Models\Invoice;
use App\Services\BrandAssetService;
use App\Services\InvoicePdfService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class InvoiceRegisteredMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Invoice $invoice) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Nouvelle facture — {$this->invoice->reference}",
        );
    }

    public function content(): Content
    {
        $brand = app(BrandAssetService::class);

        return new Content(
            view: 'emails.invoice-registered',
            with: [
                'invoice' => $this->invoice,
                'statusLabel' => $this->statusLabel(),
                'logoDataUri' => $brand->logoDataUri(),
                'appUrl' => $brand->frontendUrl('invoices'),
            ],
        );
    }

    /** @return array<int, Attachment> */
    public function attachments(): array
    {
        $pdf = app(InvoicePdfService::class)->generate($this->invoice);

        return [
            Attachment::fromData(
                fn () => $pdf->output(),
                "{$this->invoice->reference}.pdf",
            )->withMime('application/pdf'),
        ];
    }

    private function statusLabel(): string
    {
        return match ($this->invoice->status) {
            'paid' => 'Payée',
            'unpaid' => 'Non payée',
            default => 'Envoyée',
        };
    }
}
