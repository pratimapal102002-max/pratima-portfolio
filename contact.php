<?php
/**
 * ═══════════════════════════════════════════════════════════
 * PRATIMA PAL — CONTACT FORM HANDLER
 * PHPMailer · SMTP · CSRF · Honeypot · Rate Limit · XSS Safe
 * PHP 8.0+
 * ═══════════════════════════════════════════════════════════
 */

declare(strict_types=1);

/* ── Bootstrap ─────────────────────────────────────────── */
require_once __DIR__ . '/config.php';

/* ── PHPMailer autoload ─────────────────────────────────── */
if (file_exists(PHPMAILER_AUTOLOAD)) {
    require_once PHPMAILER_AUTOLOAD;
    use PHPMailer\PHPMailer\PHPMailer;
    use PHPMailer\PHPMailer\SMTP;
    use PHPMailer\PHPMailer\Exception as PHPMailerException;
} elseif (is_dir(PHPMAILER_SRC_DIR)) {
    // Manual include (no Composer)
    require_once PHPMAILER_SRC_DIR . 'Exception.php';
    require_once PHPMAILER_SRC_DIR . 'PHPMailer.php';
    require_once PHPMAILER_SRC_DIR . 'SMTP.php';
    use PHPMailer\PHPMailer\PHPMailer;
    use PHPMailer\PHPMailer\SMTP;
    use PHPMailer\PHPMailer\Exception as PHPMailerException;
} else {
    // PHPMailer not found — respond with a clear error
    sendJson(false, 'Server configuration error: PHPMailer not found. Please contact the site owner directly by email.', 500);
}


/* ══════════════════════════════════════════════════════════
   HELPER FUNCTIONS
══════════════════════════════════════════════════════════ */

/**
 * Send a JSON response and terminate.
 */
function sendJson(bool $success, string $message, int $statusCode = 200): never
{
    if (!headers_sent()) {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=UTF-8');

        // Security headers
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('X-XSS-Protection: 1; mode=block');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('Cache-Control: no-store, no-cache, must-revalidate');

        // CORS
        $origin = ALLOWED_ORIGIN;
        if ($origin !== '*' && isset($_SERVER['HTTP_ORIGIN'])) {
            $requestOrigin = $_SERVER['HTTP_ORIGIN'];
            if ($requestOrigin === $origin) {
                header("Access-Control-Allow-Origin: {$origin}");
            }
        } else {
            header("Access-Control-Allow-Origin: *");
        }
    }

    echo json_encode([
        'success' => $success,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

    exit;
}

/**
 * Sanitize a string: strip tags, trim, normalize whitespace.
 */
function sanitize(string $input, int $maxLen = 0): string
{
    $clean = strip_tags(trim($input));
    $clean = preg_replace('/\s+/', ' ', $clean);
    $clean = htmlspecialchars($clean, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

    if ($maxLen > 0 && mb_strlen($clean) > $maxLen) {
        $clean = mb_substr($clean, 0, $maxLen);
    }

    return $clean;
}

/**
 * Validate an email address strictly.
 */
function isValidEmail(string $email): bool
{
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false
        && strlen($email) <= MAX_EMAIL_LEN;
}

/**
 * Check for header injection characters in a string.
 */
function hasHeaderInjection(string $value): bool
{
    return (bool) preg_match('/[\r\n\t\0]/', $value);
}

/**
 * Generate a filesystem-safe key from an IP address.
 */
function ipToKey(string $ip): string
{
    return preg_replace('/[^a-zA-Z0-9_\-.]/', '_', $ip);
}


/* ══════════════════════════════════════════════════════════
   RATE LIMITER (filesystem-based, no Redis required)
══════════════════════════════════════════════════════════ */

function checkRateLimit(string $ip): void
{
    $dir = RATE_LIMIT_DIR;

    // Create directory if it doesn't exist
    if (!is_dir($dir)) {
        if (!mkdir($dir, 0700, true) && !is_dir($dir)) {
            // Cannot create dir — skip rate limiting (don't block the user)
            return;
        }
    }

    $file = $dir . '/' . ipToKey($ip) . '.json';
    $now  = time();

    $data = ['count' => 0, 'window_start' => $now];

    if (file_exists($file)) {
        $raw = file_get_contents($file);
        if ($raw !== false) {
            $parsed = json_decode($raw, true);
            if (is_array($parsed)) {
                $data = $parsed;
            }
        }
    }

    // Reset window if expired
    if (($now - (int) $data['window_start']) > RATE_LIMIT_WINDOW) {
        $data = ['count' => 0, 'window_start' => $now];
    }

    $data['count']++;

    // Write updated data
    file_put_contents($file, json_encode($data), LOCK_EX);

    if ($data['count'] > RATE_LIMIT_MAX) {
        $resetIn = RATE_LIMIT_WINDOW - ($now - (int) $data['window_start']);
        $minutes = (int) ceil($resetIn / 60);
        sendJson(
            false,
            "Too many requests. Please wait {$minutes} minute(s) before submitting again.",
            429
        );
    }
}

/**
 * Purge stale rate-limit files older than 2× the window.
 * Called probabilistically to avoid overhead on every request.
 */
function maybePurgeRateLimitFiles(): void
{
    if (mt_rand(1, 50) !== 1) return; // ~2% chance

    $dir = RATE_LIMIT_DIR;
    if (!is_dir($dir)) return;

    $cutoff = time() - (RATE_LIMIT_WINDOW * 2);
    foreach (glob($dir . '/*.json') ?: [] as $file) {
        if (filemtime($file) < $cutoff) {
            @unlink($file);
        }
    }
}


/* ══════════════════════════════════════════════════════════
   CSRF PROTECTION
   We use a stateless HMAC approach — no session required.
   The client receives a token embedded in the page (generated
   by PHP or client-side JS as a placeholder); on submit we
   verify via HMAC-SHA256 with a server-side secret + timestamp.
══════════════════════════════════════════════════════════ */

/**
 * Verify a CSRF token submitted with the form.
 * Token format: {timestamp}.{hmac}
 * For the JS-generated placeholder token we do a basic
 * non-empty + length check (since full HMAC requires server-
 * side generation). For full protection generate the token
 * in PHP when rendering the page.
 */
function verifyCsrfToken(string $token): bool
{
    if (empty($token)) {
        return false;
    }

    // If token contains a dot, assume our HMAC format
    if (str_contains($token, '.')) {
        [$timestamp, $receivedHmac] = explode('.', $token, 2);
        $timestamp = (int) $timestamp;

        // Token must be recent
        if ((time() - $timestamp) > CSRF_TOKEN_TTL) {
            return false;
        }

        $expectedHmac = hash_hmac('sha256', (string) $timestamp, CSRF_SECRET);
        return hash_equals($expectedHmac, $receivedHmac);
    }

    // JS-generated hex placeholder: accept if it's hex and the right length
    // (32–64 chars). Not cryptographically verified but better than nothing
    // when full server-side generation is not set up.
    return (bool) preg_match('/^[0-9a-f]{32,64}$/i', $token);
}

/**
 * Generate a server-side CSRF token for embedding in the page.
 * Call this from your PHP template if you want full HMAC protection.
 */
function generateCsrfToken(): string
{
    $ts   = time();
    $hmac = hash_hmac('sha256', (string) $ts, CSRF_SECRET);
    return "{$ts}.{$hmac}";
}


/* ══════════════════════════════════════════════════════════
   MAIN REQUEST HANDLING
══════════════════════════════════════════════════════════ */

// ── Only accept POST from XMLHttpRequest
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJson(false, 'Method not allowed.', 405);
}

if (!isset($_SERVER['HTTP_X_REQUESTED_WITH'])
    || strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) !== 'xmlhttprequest') {
    sendJson(false, 'Invalid request.', 400);
}

// ── Rate limiting
$clientIp = $_SERVER['HTTP_CF_CONNECTING_IP']   // Cloudflare
    ?? $_SERVER['HTTP_X_FORWARDED_FOR']
    ?? $_SERVER['REMOTE_ADDR']
    ?? '0.0.0.0';

// Take first IP if comma-separated (X-Forwarded-For list)
$clientIp = trim(explode(',', $clientIp)[0]);

checkRateLimit($clientIp);
maybePurgeRateLimitFiles();

// ── Honeypot — bots fill the hidden "website" field
$honeypot = $_POST['website'] ?? '';
if ($honeypot !== '') {
    // Silent success to fool bots
    sendJson(true, 'Your message has been sent successfully!');
}

// ── CSRF check
$csrfToken = trim($_POST['csrf_token'] ?? '');
if (!verifyCsrfToken($csrfToken)) {
    sendJson(false, 'Security token invalid or expired. Please refresh the page and try again.', 403);
}

// ── Collect and sanitize inputs
$name    = sanitize($_POST['name']    ?? '', MAX_NAME_LEN);
$email   = trim($_POST['email']       ?? '');
$service = sanitize($_POST['service'] ?? '', MAX_SERVICE_LEN);
$budget  = sanitize($_POST['budget']  ?? '', MAX_BUDGET_LEN);
$subject = sanitize($_POST['subject'] ?? '', MAX_SUBJECT_LEN);
$message = sanitize($_POST['message'] ?? '', MAX_MESSAGE_LEN);

// Raw email for use as reply-to (after validation)
$emailRaw = trim($_POST['email'] ?? '');

// ── Validate required fields
$errors = [];

if (mb_strlen($name) < 2) {
    $errors[] = 'Name must be at least 2 characters.';
}

if (!isValidEmail($emailRaw)) {
    $errors[] = 'Please provide a valid email address.';
}

if (mb_strlen($subject) < 3) {
    $errors[] = 'Subject must be at least 3 characters.';
}

if (mb_strlen($message) < 10) {
    $errors[] = 'Message must be at least 10 characters.';
}

// ── Header injection guard
if (hasHeaderInjection($name) || hasHeaderInjection($emailRaw) || hasHeaderInjection($subject)) {
    sendJson(false, 'Invalid characters detected in your submission.', 400);
}

// ── Validate optional selects against known lists
if ($service !== '' && !in_array($service, VALID_SERVICES, true)) {
    $service = '';
}
if ($budget !== '' && !in_array($budget, VALID_BUDGETS, true)) {
    $budget = '';
}

if (!empty($errors)) {
    sendJson(false, implode(' ', $errors), 422);
}

// ── Config sanity checks
if (empty(RECIPIENT_EMAIL) || !isValidEmail(RECIPIENT_EMAIL)) {
    sendJson(false, 'Server email configuration is incomplete. Please contact me directly via email.', 500);
}
if (empty(SMTP_USERNAME) || empty(SMTP_PASSWORD)) {
    sendJson(false, 'Server SMTP configuration is incomplete. Please contact me directly via email.', 500);
}


/* ══════════════════════════════════════════════════════════
   BUILD EMAIL BODIES
══════════════════════════════════════════════════════════ */

$submittedAt = date('d M Y, h:i A T');
$ipSafe      = htmlspecialchars($clientIp, ENT_QUOTES, 'UTF-8');

// ── HTML body sent to Pratima
$htmlBody = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>New Contact Form Submission</title>
<style>
  body{margin:0;padding:0;font-family:'Helvetica Neue',Arial,sans-serif;background:#f0f0f0;color:#333}
  .wrapper{max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)}
  .header{background:linear-gradient(135deg,#cc0000,#ff0000);padding:32px 36px;text-align:center}
  .header h1{margin:0;color:#fff;font-size:22px;letter-spacing:.02em}
  .header p{margin:6px 0 0;color:rgba(255,255,255,.8);font-size:13px}
  .body{padding:32px 36px}
  .row{margin-bottom:22px}
  .label{font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#999;margin-bottom:6px}
  .value{font-size:15px;color:#222;line-height:1.6;word-break:break-word}
  .value a{color:#cc0000;text-decoration:none}
  .divider{border:none;border-top:1px solid #eee;margin:24px 0}
  .message-box{background:#fafafa;border-left:3px solid #ff0000;padding:16px 20px;border-radius:4px}
  .meta{font-size:12px;color:#aaa;margin-top:6px}
  .footer{background:#f7f7f7;padding:20px 36px;text-align:center;font-size:12px;color:#bbb;border-top:1px solid #eee}
  .badge{display:inline-block;padding:4px 12px;background:rgba(255,0,0,.08);border:1px solid rgba(255,0,0,.2);border-radius:100px;font-size:11px;font-weight:600;color:#cc0000;margin-bottom:10px}
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>📬 New Portfolio Enquiry</h1>
    <p>Submitted via pratimapal.com contact form</p>
  </div>
  <div class="body">

    <div class="row">
      <div class="label">From</div>
      <div class="value">{$name}</div>
    </div>

    <div class="row">
      <div class="label">Email</div>
      <div class="value"><a href="mailto:{$email}">{$email}</a></div>
    </div>

HTML;

if ($service !== '') {
    $htmlBody .= <<<HTML
    <div class="row">
      <div class="label">Service Needed</div>
      <div class="value"><span class="badge">{$service}</span></div>
    </div>

HTML;
}

if ($budget !== '') {
    $htmlBody .= <<<HTML
    <div class="row">
      <div class="label">Budget Range</div>
      <div class="value">{$budget}</div>
    </div>

HTML;
}

$htmlBody .= <<<HTML
    <div class="row">
      <div class="label">Subject</div>
      <div class="value">{$subject}</div>
    </div>

    <hr class="divider"/>

    <div class="row">
      <div class="label">Message</div>
      <div class="message-box">
        <div class="value">{$message}</div>
      </div>
    </div>

    <hr class="divider"/>

    <div class="meta">
      Submitted: {$submittedAt} &nbsp;·&nbsp; IP: {$ipSafe}
    </div>
  </div>
  <div class="footer">
    This email was generated automatically by your portfolio contact form.<br/>
    Pratima Pal &mdash; pratimapal.com
  </div>
</div>
</body>
</html>
HTML;

// ── Plain-text fallback
$plainBody = "New Portfolio Enquiry\n";
$plainBody .= str_repeat('=', 40) . "\n\n";
$plainBody .= "From:    {$name}\n";
$plainBody .= "Email:   {$email}\n";
if ($service !== '') $plainBody .= "Service: {$service}\n";
if ($budget  !== '') $plainBody .= "Budget:  {$budget}\n";
$plainBody .= "Subject: {$subject}\n\n";
$plainBody .= "Message:\n{$message}\n\n";
$plainBody .= str_repeat('-', 40) . "\n";
$plainBody .= "Submitted: {$submittedAt}\nIP: {$ipSafe}\n";

// ── Auto-reply to client (plain-text)
$autoReplyText = <<<TEXT
Hi {$name},

Thank you for reaching out! I've received your message and will get back to you within 24 hours.

Here's a summary of what you sent:

Subject:  {$subject}
Service:  {$service}
Message:  {$message}

In the meantime, feel free to check out more of my work:
Instagram: https://instagram.com/hey_pratima10

Best regards,
Pratima Pal
Photo Editor · Canva Designer · Web Dev Learner
TEXT;

$autoReplySubject = "Thanks for reaching out, {$name}! ✨ — Pratima Pal";


/* ══════════════════════════════════════════════════════════
   SEND EMAILS VIA PHPMAILER
══════════════════════════════════════════════════════════ */

try {
    $mail = new PHPMailer(true);

    /* ── Server settings ──────────────────────────────── */
    $mail->isSMTP();
    $mail->SMTPDebug  = SMTP_DEBUG;
    $mail->Host       = SMTP_HOST;
    $mail->SMTPAuth   = SMTP_AUTH;
    $mail->Username   = SMTP_USERNAME;
    $mail->Password   = SMTP_PASSWORD;
    $mail->Port       = SMTP_PORT;

    // Encryption
    if (SMTP_SECURE === 'tls') {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    } elseif (SMTP_SECURE === 'ssl') {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    } else {
        $mail->SMTPSecure = '';
        $mail->SMTPAutoTLS = false;
    }

    // TLS options — important for shared hosting with self-signed certs
    $mail->SMTPOptions = [
        'ssl' => [
            'verify_peer'       => true,
            'verify_peer_name'  => true,
            'allow_self_signed' => false,
        ],
    ];

    $mail->CharSet  = PHPMailer::CHARSET_UTF8;
    $mail->Encoding = PHPMailer::ENCODING_BASE64;
    $mail->XMailer  = ' '; // Remove X-Mailer fingerprint

    /* ── From / To ────────────────────────────────────── */
    $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
    $mail->addAddress(RECIPIENT_EMAIL, RECIPIENT_NAME);

    // Reply-to is the person who submitted the form
    $mail->addReplyTo($emailRaw, $name);

    // Optional CC
    if (!empty(CC_EMAIL)) {
        foreach (array_filter(array_map('trim', explode(',', CC_EMAIL))) as $cc) {
            if (isValidEmail($cc)) $mail->addCC($cc);
        }
    }

    // Optional BCC
    if (!empty(BCC_EMAIL)) {
        foreach (array_filter(array_map('trim', explode(',', BCC_EMAIL))) as $bcc) {
            if (isValidEmail($bcc)) $mail->addBCC($bcc);
        }
    }

    /* ── Content ──────────────────────────────────────── */
    $mail->isHTML(true);
    $mail->Subject = "✨ New Enquiry: {$subject} — from {$name}";
    $mail->Body    = $htmlBody;
    $mail->AltBody = $plainBody;

    /* ── Send primary email ───────────────────────────── */
    $mail->send();

    /* ── Auto-reply ───────────────────────────────────── */
    $mail->clearAllRecipients();
    $mail->clearReplyTos();

    $mail->addAddress($emailRaw, $name);
    $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
    $mail->addReplyTo(RECIPIENT_EMAIL, RECIPIENT_NAME);

    $mail->isHTML(false);
    $mail->Subject = $autoReplySubject;
    $mail->Body    = $autoReplyText;
    $mail->AltBody = $autoReplyText;

    // Auto-reply failure is non-fatal — primary email already sent
    try {
        $mail->send();
    } catch (PHPMailerException) {
        // Intentionally silent
    }

    sendJson(true, "Your message has been sent! I'll reply within 24 hours. Check your inbox for a confirmation email.");

} catch (PHPMailerException $e) {
    // Log in production, surface debug info only in dev
    $logMsg = date('Y-m-d H:i:s') . " PHPMailerException: " . $e->getMessage() . " | IP: {$clientIp}\n";
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) @mkdir($logDir, 0700, true);
    @file_put_contents($logDir . '/mailer_errors.log', $logMsg, FILE_APPEND | LOCK_EX);

    if (APP_DEBUG) {
        sendJson(false, 'Mailer error: ' . $e->getMessage(), 500);
    }

    sendJson(
        false,
        'Sorry, your message could not be delivered right now. Please email me directly at ' . SMTP_FROM_EMAIL,
        500
    );

} catch (Throwable $e) {
    $logMsg = date('Y-m-d H:i:s') . " Unexpected error: " . $e->getMessage() . " | IP: {$clientIp}\n";
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) @mkdir($logDir, 0700, true);
    @file_put_contents($logDir . '/mailer_errors.log', $logMsg, FILE_APPEND | LOCK_EX);

    if (APP_DEBUG) {
        sendJson(false, 'Error: ' . $e->getMessage(), 500);
    }

    sendJson(
        false,
        'An unexpected error occurred. Please try again or contact me directly by email.',
        500
    );
}