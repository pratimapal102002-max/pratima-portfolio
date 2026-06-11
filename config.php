<?php
/**
 * ═══════════════════════════════════════════════════════════
 * PRATIMA PAL — PORTFOLIO CONFIG
 * Loads environment variables and exposes SMTP + security config
 * PHP 8.0+
 * ═══════════════════════════════════════════════════════════
 */

declare(strict_types=1);

/* ──────────────────────────────────────────────────────────
   1. ENVIRONMENT LOADER
   Reads a .env file from the project root if present.
   Falls back to actual environment variables (Hostinger / cPanel
   can set these via PHP environment or the control panel).
────────────────────────────────────────────────────────── */

function loadEnv(string $path): void
{
    if (!is_readable($path)) {
        return; // No .env file — rely on real environment variables
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);

        // Skip comments and empty lines
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        // Must contain an equals sign
        if (!str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $key   = trim($key);
        $value = trim($value);

        // Strip surrounding quotes (single or double)
        if (
            (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
            (str_starts_with($value, "'") && str_ends_with($value, "'"))
        ) {
            $value = substr($value, 1, -1);
        }

        // Only set if not already defined in the real environment
        if (!array_key_exists($key, $_ENV) && !array_key_exists($key, $_SERVER)) {
            putenv("{$key}={$value}");
            $_ENV[$key]    = $value;
            $_SERVER[$key] = $value;
        }
    }
}

/**
 * Get an environment variable with an optional default.
 */
function env(string $key, mixed $default = null): mixed
{
    $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);

    if ($value === false || $value === null || $value === '') {
        return $default;
    }

    // Type coercion for booleans and integers
    return match (strtolower((string) $value)) {
        'true',  'yes', '1' => true,
        'false', 'no',  '0' => false,
        default             => $value,
    };
}

// ── Load .env from the directory containing this config file
loadEnv(__DIR__ . '/.env');


/* ──────────────────────────────────────────────────────────
   2. APPLICATION CONFIG
────────────────────────────────────────────────────────── */

define('APP_ENV',   (string) env('APP_ENV', 'production'));
define('APP_DEBUG', (bool)   env('APP_DEBUG', false));
define('APP_URL',   (string) env('APP_URL', ''));


/* ──────────────────────────────────────────────────────────
   3. SMTP CONFIGURATION
   Works with Gmail (STARTTLS on 587) or Hostinger (SSL on 465).
   See .env.example for variable names.
────────────────────────────────────────────────────────── */

define('SMTP_HOST',       (string) env('SMTP_HOST',       'smtp.gmail.com'));
define('SMTP_PORT',       (int)    env('SMTP_PORT',       587));
define('SMTP_SECURE',     (string) env('SMTP_SECURE',     'tls'));  // 'tls' | 'ssl' | ''
define('SMTP_AUTH',       (bool)   env('SMTP_AUTH',       true));
define('SMTP_USERNAME',   (string) env('SMTP_USERNAME',   ''));
define('SMTP_PASSWORD',   (string) env('SMTP_PASSWORD',   ''));
define('SMTP_FROM_EMAIL', (string) env('SMTP_FROM_EMAIL', ''));
define('SMTP_FROM_NAME',  (string) env('SMTP_FROM_NAME',  'Pratima Pal Portfolio'));
define('SMTP_REPLY_TO',   (string) env('SMTP_REPLY_TO',   ''));  // optional; falls back to sender
define('SMTP_DEBUG',      (int)    env('SMTP_DEBUG',      0));   // 0=off, 1=errors, 2=verbose


/* ──────────────────────────────────────────────────────────
   4. EMAIL ROUTING
────────────────────────────────────────────────────────── */

// Where form submissions are delivered
define('RECIPIENT_EMAIL', (string) env('RECIPIENT_EMAIL', ''));
define('RECIPIENT_NAME',  (string) env('RECIPIENT_NAME',  'Pratima Pal'));

// Optional CC / BCC (comma-separated or empty)
define('CC_EMAIL',  (string) env('CC_EMAIL',  ''));
define('BCC_EMAIL', (string) env('BCC_EMAIL', ''));


/* ──────────────────────────────────────────────────────────
   5. SECURITY SETTINGS
────────────────────────────────────────────────────────── */

// CSRF token lifetime in seconds (default 2 hours)
define('CSRF_TOKEN_TTL',   (int) env('CSRF_TOKEN_TTL',   7200));
// Shared secret for HMAC-based CSRF tokens
define('CSRF_SECRET',      (string) env('CSRF_SECRET',   'change-me-in-env'));

// Rate limiting — max submissions per window per IP
define('RATE_LIMIT_MAX',    (int) env('RATE_LIMIT_MAX',    5));
define('RATE_LIMIT_WINDOW', (int) env('RATE_LIMIT_WINDOW', 3600)); // seconds

// Allowed origin for CORS (set to your domain, e.g. https://pratimapal.com)
define('ALLOWED_ORIGIN',    (string) env('ALLOWED_ORIGIN', '*'));

// Input length limits
define('MAX_NAME_LEN',    100);
define('MAX_EMAIL_LEN',   254);
define('MAX_SUBJECT_LEN', 200);
define('MAX_MESSAGE_LEN', 5000);
define('MAX_BUDGET_LEN',  50);
define('MAX_SERVICE_LEN', 60);


/* ──────────────────────────────────────────────────────────
   6. RATE-LIMIT STORAGE
   Uses the filesystem by default (no Redis/Memcached needed).
   Set RATE_LIMIT_DIR to a writable path outside the webroot.
────────────────────────────────────────────────────────── */

define('RATE_LIMIT_DIR', (string) env(
    'RATE_LIMIT_DIR',
    sys_get_temp_dir() . '/pratima_ratelimit'
));


/* ──────────────────────────────────────────────────────────
   7. PHPMAILER AUTOLOAD PATH
   Adjust if PHPMailer is installed via Composer or manually.
────────────────────────────────────────────────────────── */

// Composer autoload (preferred)
define('PHPMAILER_AUTOLOAD',  __DIR__ . '/vendor/autoload.php');

// Manual include paths (fallback if Composer is not used)
define('PHPMAILER_SRC_DIR',   __DIR__ . '/phpmailer/src/');

// Available services list for validation
define('VALID_SERVICES', [
    'Photo Editing – Basic',
    'Photo Editing – Premium',
    'Canva Design',
    'Portfolio Website',
    'Landing Page',
    'Other',
]);

define('VALID_BUDGETS', [
    'Under ₹500',
    '₹500 – ₹1,500',
    '₹1,500 – ₹5,000',
    '₹5,000+',
    '',
]);


/* ──────────────────────────────────────────────────────────
   8. ERROR REPORTING
────────────────────────────────────────────────────────── */

if (APP_DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(0);
    ini_set('display_errors', '0');
    // Log errors to file in production
    ini_set('log_errors', '1');
    ini_set('error_log', __DIR__ . '/logs/php_errors.log');
}


/* ──────────────────────────────────────────────────────────
   9. TIMEZONE
────────────────────────────────────────────────────────── */

date_default_timezone_set((string) env('APP_TIMEZONE', 'Asia/Kolkata'));