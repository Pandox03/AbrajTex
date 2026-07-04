<?php

$out = dirname(__DIR__).'/public/images/footer-chevron.png';
$width = 24;
$height = 80;

$img = imagecreatetruecolor($width, $height);
imagesavealpha($img, true);
$transparent = imagecolorallocatealpha($img, 0, 0, 0, 127);
imagefill($img, 0, 0, $transparent);

$gray = imagecolorallocate($img, 95, 94, 90);
imagefilledpolygon($img, [0, 0, 0, $height, $width, (int) ($height / 2)], 3, $gray);

imagepng($img, $out);
imagedestroy($img);

echo "Saved: {$out}\n";
