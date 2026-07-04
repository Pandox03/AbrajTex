<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Container extends Model
{
    protected $fillable = [
        'reference',
        'arrival_date',
        'origin',
        'supplier_reference',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'arrival_date' => 'date',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(ContainerItem::class);
    }

    public function rolls(): HasMany
    {
        return $this->hasMany(FabricRoll::class);
    }
}
