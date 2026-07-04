<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;

class ActivityLogger
{
    public function log(
        ?User $user,
        Request $request,
        string $action,
        string $description,
        ?string $subjectType = null,
        ?int $subjectId = null,
        ?array $properties = null,
    ): ActivityLog {
        return ActivityLog::create([
            'user_id' => $user?->id,
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'description' => $description,
            'properties' => $properties,
            'ip_address' => $request->ip(),
        ]);
    }
}
