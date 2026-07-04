<?php

$out = dirname(__DIR__).'/public/images/footer-ribbon-bg.png';
$width = 595;
$height = 80;
$stripeHeight = 16;
$stripeWidth = (int) round($width * 0.30);
$chevronDepth = 26;
$bannerStart = $stripeWidth + $chevronDepth;

$img = imagecreatetruecolor($width, $height);
$tealTop = imagecolorallocate($img, 0x1D, 0x9E, 0x75);
$tealBottom = imagecolorallocate($img, 0x0F, 0x6E, 0x56);
$banner = imagecolorallocate($img, 0xEC, 0xFD, 0xF9);
$bannerBorder = imagecolorallocate($img, 0x99, 0xF6, 0xE4);
$white = imagecolorallocate($img, 0xFF, 0xFF, 0xFF);

imagefilledrectangle($img, 0, 0, $width, $height, $white);
imagefilledrectangle($img, 0, 0, $stripeWidth, $stripeHeight, $tealTop);
imagefilledrectangle($img, 0, $stripeHeight, $stripeWidth, $stripeHeight * 2, $tealBottom);
imagefilledpolygon(
    $img,
    [
        $stripeWidth, 0,
        $stripeWidth, $stripeHeight * 2,
        $bannerStart, (int) ($stripeHeight),
    ],
    3,
    $banner
);
imagefilledrectangle($img, $bannerStart, 0, $width, $height, $banner);
imagerectangle($img, $bannerStart, 0, $width - 1, $height - 1, $bannerBorder);
imageline($img, 0, $height - 1, $bannerStart, $height - 1, $bannerBorder);

imagepng($img, $out);
imagedestroy($img);

echo "Saved: {$out}\n";
echo "Banner starts: {$bannerStart}px\n";
