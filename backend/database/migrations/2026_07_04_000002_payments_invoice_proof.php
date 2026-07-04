<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('proof_document')->nullable()->after('bank_reference');
        });

        DB::table('payments')
            ->whereNotNull('invoice_id')
            ->update(['sale_id' => null]);

        DB::table('payments')->whereNull('invoice_id')->delete();
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn('proof_document');
        });
    }
};
