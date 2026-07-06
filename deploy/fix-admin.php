<?php

declare(strict_types=1);

require __DIR__.'/backend/vendor/autoload.php';
$app = require __DIR__.'/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;

echo 'DB: '.config('database.connections.mysql.database')."\n";
echo 'Users before: '.User::count()."\n";

foreach (User::select('email', 'role')->get() as $user) {
    echo "  {$user->email} ({$user->role})\n";
}

User::updateOrCreate(
    ['email' => 'admin@abrajetex.com'],
    [
        'name' => 'Administrateur',
        'password' => 'AbrajTex2026!',
        'role' => 'admin',
    ]
);

User::whereIn('email', [
    'secretaire@abrajetex.com',
    'comptable@abrajetex.com',
])->delete();

echo 'Users after: '.User::count()."\n";
echo "Admin password set to AbrajTex2026!\n";
