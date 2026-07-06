<?php

declare(strict_types=1);

require __DIR__.'/../backend/vendor/autoload.php';
$app = require __DIR__.'/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$email = $argv[1] ?? env('ADMIN_EMAIL', 'admin@abrajetex.com');
$password = $argv[2] ?? env('ADMIN_PASSWORD', 'AbrajTex2026!');

$user = User::updateOrCreate(
    ['email' => $email],
    [
        'name' => env('ADMIN_NAME', 'Administrateur'),
        'password' => $password,
        'role' => 'admin',
    ]
);

echo "Admin reset: {$user->email}\n";
echo 'Verify: '.(Hash::check($password, $user->fresh()->password) ? 'OK' : 'FAIL')."\n";
