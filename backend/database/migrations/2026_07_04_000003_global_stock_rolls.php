<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fabric_rolls', function (Blueprint $table) {
            $table->dropForeign(['container_id']);
        });

        Schema::table('fabric_rolls', function (Blueprint $table) {
            $table->foreignId('container_id')->nullable()->change();
            $table->foreign('container_id')->references('id')->on('containers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('fabric_rolls', function (Blueprint $table) {
            $table->dropForeign(['container_id']);
        });

        Schema::table('fabric_rolls', function (Blueprint $table) {
            $table->foreignId('container_id')->nullable(false)->change();
            $table->foreign('container_id')->references('id')->on('containers')->cascadeOnDelete();
        });
    }
};
