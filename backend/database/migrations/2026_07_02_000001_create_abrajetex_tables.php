<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('containers', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->date('arrival_date');
            $table->string('origin')->default('China');
            $table->string('supplier_reference')->nullable();
            $table->enum('status', ['in_transit', 'arrived', 'processing', 'closed'])->default('arrived');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('fabric_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->nullable();
            $table->foreignId('parent_id')->nullable()->constrained('fabric_types')->nullOnDelete();
            $table->string('composition')->nullable();
            $table->unsignedSmallInteger('default_width_cm')->nullable();
            $table->unsignedSmallInteger('default_gsm')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('container_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('container_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fabric_type_id')->constrained()->cascadeOnDelete();
            $table->string('color_code');
            $table->string('color_name')->nullable();
            $table->decimal('quantity_m2', 12, 2);
            $table->unsignedInteger('estimated_rolls')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['container_id', 'fabric_type_id', 'color_code']);
        });

        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('ice_number')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->date('sale_date');
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('fabric_rolls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('container_id')->constrained()->cascadeOnDelete();
            $table->foreignId('container_item_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('fabric_type_id')->constrained()->cascadeOnDelete();
            $table->string('color_code');
            $table->string('roll_number');
            $table->string('order_number')->nullable();
            $table->string('origin')->default('China');
            $table->unsignedSmallInteger('width_cm');
            $table->decimal('length_m', 8, 2);
            $table->decimal('quantity_m2', 12, 2);
            $table->decimal('gross_weight_kg', 8, 2)->nullable();
            $table->decimal('net_weight_kg', 8, 2)->nullable();
            $table->unsignedSmallInteger('gsm')->nullable();
            $table->string('composition')->nullable();
            $table->enum('status', ['available', 'reserved', 'sold'])->default('available');
            $table->foreignId('sale_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('sold_at')->nullable();
            $table->timestamps();

            $table->unique(['fabric_type_id', 'roll_number']);
        });

        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fabric_roll_id')->constrained()->cascadeOnDelete();
            $table->decimal('unit_price', 12, 2);
            $table->decimal('quantity_m2', 12, 2);
            $table->decimal('line_total', 12, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('fabric_rolls');
        Schema::dropIfExists('sales');
        Schema::dropIfExists('clients');
        Schema::dropIfExists('container_items');
        Schema::dropIfExists('fabric_types');
        Schema::dropIfExists('containers');
    }
};
