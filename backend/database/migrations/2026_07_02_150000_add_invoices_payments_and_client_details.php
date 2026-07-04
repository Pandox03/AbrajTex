<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->string('contact_person')->nullable()->after('name');
            $table->string('city')->nullable()->after('address');
            $table->string('category')->nullable()->after('city');
            $table->decimal('credit_limit', 12, 2)->nullable()->after('ice_number');
            $table->unsignedSmallInteger('payment_terms_days')->default(30)->after('credit_limit');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->enum('payment_status', ['unpaid', 'partial', 'paid'])->default('unpaid')->after('total_amount');
            $table->decimal('paid_amount', 12, 2)->default(0)->after('payment_status');
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->string('reference')->unique();
            $table->date('invoice_date');
            $table->date('due_date')->nullable();
            $table->decimal('subtotal', 12, 2);
            $table->decimal('tax_rate', 5, 2)->default(20);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('total', 12, 2);
            $table->enum('status', ['draft', 'sent', 'paid', 'overdue', 'cancelled'])->default('sent');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reference')->unique();
            $table->decimal('amount', 12, 2);
            $table->date('payment_date');
            $table->enum('method', ['especes', 'cheque', 'virement', 'effet', 'autre'])->default('virement');
            $table->enum('status', ['pending', 'confirmed', 'cancelled'])->default('confirmed');
            $table->string('bank_reference')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoices');
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn(['payment_status', 'paid_amount']);
        });
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn(['contact_person', 'city', 'category', 'credit_limit', 'payment_terms_days']);
        });
    }
};
