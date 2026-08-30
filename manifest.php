<?php
header('Content-Type: application/manifest+json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
$arquivo = __DIR__ . '/manifest.webmanifest';
if (!is_file($arquivo)) {
    http_response_code(404);
    echo '{"name":"Saideira"}';
    exit;
}
readfile($arquivo);
