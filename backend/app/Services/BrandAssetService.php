<?php

namespace App\Services;

class BrandAssetService
{
    public function logoDataUri(): ?string
    {
        return $this->imageDataUri($this->resolveLogoPath());
    }

    public function logoHeaderDataUri(): ?string
    {
        $headerPath = public_path('images/logo-header.png');

        if (is_file($headerPath)) {
            return $this->imageDataUri($headerPath);
        }

        return $this->logoDataUri();
    }

    private function resolveLogoPath(): ?string
    {
        $configured = config('company.logo_path');
        $candidates = array_filter([
            $configured ? (str_starts_with($configured, DIRECTORY_SEPARATOR) || preg_match('#^[A-Za-z]:\\\\#', $configured)
                ? $configured
                : base_path($configured)) : null,
            public_path('images/logo.png'),
            public_path('logo.png'),
            base_path('../frontend/public/logo.png'),
        ]);

        foreach ($candidates as $path) {
            if (is_string($path) && is_file($path)) {
                return $path;
            }
        }

        return null;
    }

    private function imageDataUri(?string $path): ?string
    {
        if (! is_string($path) || ! is_file($path)) {
            return null;
        }

        $mime = mime_content_type($path) ?: 'image/png';

        return 'data:'.$mime.';base64,'.base64_encode((string) file_get_contents($path));
    }

    public function footerRibbonBgDataUri(): ?string
    {
        return $this->imageDataUri(public_path('images/footer-ribbon-bg.png'));
    }

    public function frontendUrl(string $path = ''): string
    {
        $base = rtrim((string) env('FRONTEND_URL', config('app.url')), '/');

        return $path === '' ? $base : $base.'/'.ltrim($path, '/');
    }
}
