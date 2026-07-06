<?php

declare(strict_types=1);

require __DIR__.'/backend/vendor/autoload.php';
$app = require __DIR__.'/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;

$newPassword = 'AbrajTex2026!';

$user = User::updateOrCreate(
    ['email' => 'admin@abrajetex.com'],
    [
        'name' => 'Administrateur',
        'password' => $newPassword,
        'role' => 'admin',
    ]
);

User::whereIn('email', [
    'secretaire@abrajetex.com',
    'comptable@abrajetex.com',
])->delete();

echo "Admin: {$user->email}\n";
echo 'Check: '.(Illuminate\Support\Facades\Hash::check($newPassword, $user->fresh()->password) ? 'OK' : 'FAIL')."\n";
