<?php

$path = dirname(__DIR__).'/public/images/logo.png';
$out = dirname(__DIR__).'/public/images/logo-header.png';

$img = @imagecreatefrompng($path);
if ($img === false) {
    $img = @imagecreatefromstring((string) file_get_contents($path));
}
if ($img === false) {
    fwrite(STDERR, "Could not load image: {$path}\n");
    exit(1);
}

imagealphablending($img, false);
imagesavealpha($img, true);

$w = imagesx($img);
$h = imagesy($img);
$minX = $w;
$minY = $h;
$maxX = 0;
$maxY = 0;
$step = 4;

for ($y = 0; $y < $h; $y += $step) {
    for ($x = 0; $x < $w; $x += $step) {
        $rgba = imagecolorat($img, $x, $y);
        $a = ($rgba >> 24) & 0x7F;
        $r = ($rgba >> 16) & 0xFF;
        $g = ($rgba >> 8) & 0xFF;
        $b = $rgba & 0xFF;

        if ($a < 120 && ! ($r > 248 && $g > 248 && $b > 248)) {
            $minX = min($minX, $x);
            $minY = min($minY, $y);
            $maxX = max($maxX, $x);
            $minY = min($minY, $y);
            $maxX = max($maxX, $x);
            $maxY = max($maxY, $y);
        }
    }
}

$pad = 8;
$minX = max(0, $minX - $pad);
$minY = max(0, $minY - $pad);
$maxX = min($w - 1, $maxX + $pad);
$maxY = min($h - 1, $maxY + $pad);
$cropW = $maxX - $minX + 1;
$cropH = $maxY - $minY + 1;

$cropped = imagecrop($img, [
    'x' => $minX,
    'y' => $minY,
    'width' => $cropW,
    'height' => $cropH,
]);

imagepng($cropped, $out);

echo "Original: {$w}x{$h}\n";
echo "Cropped: {$cropW}x{$cropH}\n";
echo "Saved: {$out}\n";
