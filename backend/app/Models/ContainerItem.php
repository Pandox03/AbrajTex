<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContainerItem extends Model
{
    protected $fillable = [
        'container_id',
        'fabric_type_id',
        'color_code',
        'color_name',
        'quantity_m2',
        'estimated_rolls',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'quantity_m2' => 'decimal:2',
        ];
    }

    public function container(): BelongsTo
    {
        return $this->belongsTo(Container::class);
    }

    public function fabricType(): BelongsTo
    {
        return $this->belongsTo(FabricType::class);
    }

    public function rolls(): HasMany
    {
        return $this->hasMany(FabricRoll::class);
    }

    public function soldQuantityM2(): float
    {
        return (float) $this->rolls()->where('status', 'sold')->sum('quantity_m2');
    }

    public function availableQuantityM2(): float
    {
        return (float) $this->quantity_m2 - $this->soldQuantityM2();
    }
}
