<?php

namespace App\Support;

class FrenchAmountInWords
{
    private const UNITS = [
        0 => 'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
        'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf',
    ];

    public static function format(float $amount): string
    {
        $dirhams = (int) floor($amount);
        $centimes = (int) round(($amount - $dirhams) * 100);

        if ($centimes === 100) {
            $dirhams++;
            $centimes = 0;
        }

        $words = self::numberToWords($dirhams);
        $result = ucfirst($words).' '.($dirhams > 1 ? 'dirhams' : 'dirham');

        if ($centimes > 0) {
            $result .= ' et '.self::numberToWords($centimes).' '.($centimes > 1 ? 'centimes' : 'centime');
        }

        return $result;
    }

    private static function underHundred(int $number): string
    {
        if ($number < 20) {
            return self::UNITS[$number];
        }

        if ($number < 70) {
            $tens = intdiv($number, 10);
            $unit = $number % 10;
            $words = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'][$tens];

            if ($unit === 0) {
                return $words;
            }

            if ($unit === 1 && $tens !== 8) {
                return $words.' et un';
            }

            return $words.'-'.self::UNITS[$unit];
        }

        if ($number < 80) {
            return 'soixante-'.self::UNITS[$number - 60];
        }

        $rest = $number - 80;

        if ($rest === 0) {
            return 'quatre-vingts';
        }

        if ($rest < 20) {
            return 'quatre-vingt-'.self::UNITS[$rest];
        }

        return 'quatre-vingt-'.self::UNITS[$rest];
    }

    private static function numberToWords(int $number): string
    {
        if ($number < 0) {
            return 'moins '.self::numberToWords(abs($number));
        }

        if ($number < 100) {
            return self::underHundred($number);
        }

        if ($number < 1000) {
            $hundreds = intdiv($number, 100);
            $rest = $number % 100;
            $word = $hundreds === 1 ? 'cent' : self::UNITS[$hundreds].' cent';

            if ($rest === 0 && $hundreds > 1) {
                $word .= 's';
            }

            return $rest === 0 ? $word : $word.' '.self::numberToWords($rest);
        }

        if ($number < 1_000_000) {
            $thousands = intdiv($number, 1000);
            $rest = $number % 1000;
            $word = $thousands === 1 ? 'mille' : self::numberToWords($thousands).' mille';

            return $rest === 0 ? $word : $word.' '.self::numberToWords($rest);
        }

        $millions = intdiv($number, 1_000_000);
        $rest = $number % 1_000_000;
        $word = $millions === 1 ? 'un million' : self::numberToWords($millions).' millions';

        return $rest === 0 ? $word : $word.' '.self::numberToWords($rest);
    }
}
