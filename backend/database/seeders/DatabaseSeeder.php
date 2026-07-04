<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Production-safe bootstrap: creates the initial admin user only.
     * Set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD in .env before seeding.
     */
    public function run(): void
    {
        $email = (string) env('ADMIN_EMAIL', 'admin@abrajetex.com');
        $password = env('ADMIN_PASSWORD');

        if (! is_string($password) || $password === '') {
            if (app()->environment('production')) {
                $this->command?->warn('ADMIN_PASSWORD is not set. No admin user was seeded.');

                return;
            }

            $password = 'password';
            $this->command?->warn('Using default local admin password ("password"). Set ADMIN_PASSWORD in production.');
        }

        User::updateOrCreate(
            ['email' => $email],
            [
                'name' => (string) env('ADMIN_NAME', 'Administrateur'),
                'password' => Hash::make($password),
                'role' => 'admin',
            ]
        );

        $this->command?->info("Admin user ready: {$email}");
    }
}
