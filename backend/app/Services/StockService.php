<?php

namespace App\Services;

use App\Models\ContainerItem;
use App\Models\FabricRoll;
use App\Models\FabricType;
use InvalidArgumentException;

class StockService
{
    /**
     * @return array<int, array{
     *     fabric_type_id: int,
     *     total_m2: float,
     *     sold_m2: float,
     *     available_m2: float,
     *     total_rolls: int,
     *     sold_rolls: int,
     *     available_rolls: int
     * }>
     */
    public function globalStockLines(): array
    {
        $incoming = ContainerItem::query()
            ->select('fabric_type_id')
            ->selectRaw('SUM(quantity_m2) as total_m2')
            ->selectRaw('SUM(COALESCE(estimated_rolls, 0)) as total_rolls')
            ->groupBy('fabric_type_id')
            ->get()
            ->keyBy('fabric_type_id');

        $sold = FabricRoll::query()
            ->where('status', 'sold')
            ->select('fabric_type_id')
            ->selectRaw('SUM(quantity_m2) as sold_m2')
            ->selectRaw('COUNT(*) as sold_rolls')
            ->groupBy('fabric_type_id')
            ->get()
            ->keyBy('fabric_type_id');

        $lines = [];

        foreach ($incoming as $fabricTypeId => $row) {
            $lines[] = $this->buildLine(
                (int) $fabricTypeId,
                round((float) $row->total_m2, 2),
                (int) $row->total_rolls,
                $sold->get($fabricTypeId),
            );
        }

        usort($lines, fn ($a, $b) => $a['fabric_type_id'] <=> $b['fabric_type_id']);

        return $lines;
    }

    public function globalSummary(): array
    {
        $totalM2 = round((float) ContainerItem::sum('quantity_m2'), 2);
        $soldM2 = round((float) FabricRoll::where('status', 'sold')->sum('quantity_m2'), 2);
        $totalRolls = (int) ContainerItem::sum('estimated_rolls');
        $soldRolls = FabricRoll::where('status', 'sold')->count();

        return [
            'total_m2' => $totalM2,
            'sold_m2' => $soldM2,
            'available_m2' => round(max(0, $totalM2 - $soldM2), 2),
            'total_rolls' => $totalRolls,
            'sold_rolls' => $soldRolls,
            'available_rolls' => max(0, $totalRolls - $soldRolls),
            'available_fabric_rolls' => FabricRoll::where('status', 'available')->count(),
            'lines_count' => count($this->globalStockLines()),
        ];
    }

    /**
     * @return array{
     *     found: bool,
     *     fabric_type_id: int,
     *     fabric_type_name?: string,
     *     available_m2: float,
     *     total_m2: float,
     *     sold_m2: float,
     *     total_rolls: int,
     *     sold_rolls: int,
     *     available_rolls: int,
     *     avg_m2_per_roll: float
     * }
     */
    public function availability(int $fabricTypeId): array
    {
        $fabricType = FabricType::query()->find($fabricTypeId);

        $totalM2 = round((float) ContainerItem::query()
            ->where('fabric_type_id', $fabricTypeId)
            ->sum('quantity_m2'), 2);

        if ($totalM2 <= 0) {
            return [
                'found' => false,
                'fabric_type_id' => $fabricTypeId,
                'fabric_type_name' => $fabricType?->name,
                'available_m2' => 0,
                'total_m2' => 0,
                'sold_m2' => 0,
                'total_rolls' => 0,
                'sold_rolls' => 0,
                'available_rolls' => 0,
                'avg_m2_per_roll' => 0,
            ];
        }

        $soldM2 = round((float) FabricRoll::query()
            ->where('fabric_type_id', $fabricTypeId)
            ->where('status', 'sold')
            ->sum('quantity_m2'), 2);

        $totalRolls = (int) ContainerItem::query()
            ->where('fabric_type_id', $fabricTypeId)
            ->sum('estimated_rolls');

        $soldRolls = FabricRoll::query()
            ->where('fabric_type_id', $fabricTypeId)
            ->where('status', 'sold')
            ->count();

        $availableM2 = round(max(0, $totalM2 - $soldM2), 2);
        $availableRolls = $this->resolveAvailableRolls($fabricTypeId, $totalRolls, $soldRolls, $availableM2, $fabricType);

        return [
            'found' => true,
            'fabric_type_id' => $fabricTypeId,
            'fabric_type_name' => $fabricType?->name,
            'available_m2' => $availableM2,
            'total_m2' => $totalM2,
            'sold_m2' => $soldM2,
            'total_rolls' => $totalRolls,
            'sold_rolls' => $soldRolls,
            'available_rolls' => $availableRolls,
            'avg_m2_per_roll' => $this->averageM2PerRoll($fabricTypeId, $totalM2, $totalRolls, $fabricType),
        ];
    }

    public function averageM2PerRoll(int $fabricTypeId, ?float $totalM2 = null, ?int $totalRolls = null, ?FabricType $fabricType = null): float
    {
        $totalM2 ??= (float) ContainerItem::query()
            ->where('fabric_type_id', $fabricTypeId)
            ->sum('quantity_m2');

        $totalRolls ??= (int) ContainerItem::query()
            ->where('fabric_type_id', $fabricTypeId)
            ->sum('estimated_rolls');

        if ($totalRolls > 0 && $totalM2 > 0) {
            return round($totalM2 / $totalRolls, 2);
        }

        $fabricType ??= FabricType::query()->find($fabricTypeId);
        $widthCm = (int) ($fabricType?->default_width_cm ?? 150);

        return FabricRoll::calculateM2($widthCm, 50);
    }

    public function assertGlobalStockExists(int $fabricTypeId): void
    {
        $availability = $this->availability($fabricTypeId);

        if (! $availability['found']) {
            throw new InvalidArgumentException(sprintf(
                'Aucun stock enregistré pour %s. Enregistrez d\'abord l\'arrivée via un conteneur.',
                $availability['fabric_type_name'] ?? 'tissu',
            ));
        }
    }

    /**
     * @param  array<int, array{fabric_type_id: int, roll_count: int, quantity_m2?: float}>  $lines
     */
    public function assertSufficientStockForSaleLines(array $lines): void
    {
        /** @var array<int, array{fabric_type_id: int, roll_count: int, quantity_m2: float}> $pendingByType */
        $pendingByType = [];
        $errors = [];

        foreach ($lines as $line) {
            $typeId = (int) $line['fabric_type_id'];
            $lineM2 = isset($line['quantity_m2'])
                ? round((float) $line['quantity_m2'], 2)
                : 0.0;

            if (! isset($pendingByType[$typeId])) {
                $pendingByType[$typeId] = [
                    'fabric_type_id' => $typeId,
                    'roll_count' => 0,
                    'quantity_m2' => 0.0,
                ];
            }

            $pendingByType[$typeId]['roll_count'] += (int) $line['roll_count'];
            $pendingByType[$typeId]['quantity_m2'] += $lineM2;
        }

        foreach ($pendingByType as $entry) {
            $availability = $this->availability($entry['fabric_type_id']);
            $requestedRolls = $entry['roll_count'];
            $requestedM2 = round($entry['quantity_m2'], 2);

            if (! $availability['found']) {
                $errors[] = sprintf(
                    'Aucun stock enregistré pour %s.',
                    $availability['fabric_type_name'] ?? 'tissu',
                );

                continue;
            }

            if ($requestedRolls > $availability['available_rolls']) {
                $errors[] = sprintf(
                    'Stock insuffisant pour %s : %d rouleau(x) disponible(s), vente demandée %d rouleau(x).',
                    $availability['fabric_type_name'] ?? 'tissu',
                    $availability['available_rolls'],
                    $requestedRolls,
                );
            }

            if ($requestedM2 > $availability['available_m2'] + 0.01) {
                $errors[] = sprintf(
                    'Stock insuffisant pour %s : disponible %s m², vente demandée %s m².',
                    $availability['fabric_type_name'] ?? 'tissu',
                    number_format($availability['available_m2'], 2, ',', ' '),
                    number_format($requestedM2, 2, ',', ' '),
                );
            }
        }

        if ($errors !== []) {
            throw new InvalidArgumentException(implode("\n", $errors));
        }
    }

    public function rollLineLabel(FabricRoll $roll): string
    {
        $roll->loadMissing('fabricType');

        return $roll->fabricType?->name ?? 'Tissu';
    }

    /**
     * @param  object{ sold_m2?: mixed, sold_rolls?: mixed }|null  $soldRow
     * @return array{
     *     fabric_type_id: int,
     *     total_m2: float,
     *     sold_m2: float,
     *     available_m2: float,
     *     total_rolls: int,
     *     sold_rolls: int,
     *     available_rolls: int
     * }
     */
    private function buildLine(int $fabricTypeId, float $totalM2, int $totalRolls, ?object $soldRow): array
    {
        $soldM2 = round((float) ($soldRow?->sold_m2 ?? 0), 2);
        $soldRolls = (int) ($soldRow?->sold_rolls ?? 0);
        $availableM2 = round(max(0, $totalM2 - $soldM2), 2);
        $fabricType = FabricType::query()->find($fabricTypeId);

        return [
            'fabric_type_id' => $fabricTypeId,
            'total_m2' => $totalM2,
            'sold_m2' => $soldM2,
            'available_m2' => $availableM2,
            'total_rolls' => $totalRolls,
            'sold_rolls' => $soldRolls,
            'available_rolls' => $this->resolveAvailableRolls($fabricTypeId, $totalRolls, $soldRolls, $availableM2, $fabricType),
        ];
    }

    private function resolveAvailableRolls(
        int $fabricTypeId,
        int $totalRolls,
        int $soldRolls,
        float $availableM2,
        ?FabricType $fabricType,
    ): int {
        if ($totalRolls > 0) {
            return max(0, $totalRolls - $soldRolls);
        }

        if ($availableM2 <= 0) {
            return 0;
        }

        $avgM2 = $this->averageM2PerRoll($fabricTypeId, null, null, $fabricType);

        return max(0, (int) floor($availableM2 / max(0.01, $avgM2)));
    }
}
