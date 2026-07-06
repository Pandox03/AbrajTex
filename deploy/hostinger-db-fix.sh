#!/bin/bash
set -euo pipefail

DB_PASS="${1:-Abrajetex@2026}"
APP_DIR="$HOME/domains/abrajtex.com/abrajtex/backend"
ENV_FILE="$APP_DIR/.env"

sed -i 's|^DB_HOST=.*|DB_HOST=127.0.0.1|' "$ENV_FILE"
sed -i 's|^DB_DATABASE=.*|DB_DATABASE=u692458824_AbrajTex|' "$ENV_FILE"
sed -i 's|^DB_USERNAME=.*|DB_USERNAME=u692458824_AbrajTex|' "$ENV_FILE"
sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=\"${DB_PASS//\"/\\\"}\"|" "$ENV_FILE"

php -r "
try {
  new PDO('mysql:host=127.0.0.1;dbname=u692458824_AbrajTex;charset=utf8mb4', 'u692458824_AbrajTex', '$DB_PASS', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
  echo \"MySQL: OK\n\";
} catch (Throwable \$e) {
  echo 'MySQL: FAIL - ' . \$e->getMessage() . \"\n\";
  exit(1);
}
"

cd "$APP_DIR"
php artisan config:clear
php artisan config:cache

php -r "
require 'vendor/autoload.php';
\$app = require 'bootstrap/app.php';
\$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
echo 'Laravel users: ' . App\Models\User::count() . PHP_EOL;
"

echo "Done."
