<?php

function json_in(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function ok($data = [], int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $msg, int $code = 400): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'erro' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

function pub(string $prefix, $id): string
{
    return $prefix . '-' . (int) $id;
}

function nid(string $prefix, ?string $public): ?int
{
    if (!$public) return null;
    if (preg_match('/^' . preg_quote($prefix, '/') . '-(\d+)$/', $public, $m)) {
        return (int) $m[1];
    }
    if (ctype_digit($public)) return (int) $public;
    return null;
}

function iso(?string $dt): ?string
{
    if (!$dt) return null;
    return date('c', strtotime($dt));
}

function br_date(?string $dt): string
{
    if (!$dt) return '';
    return date('d/m/Y', strtotime($dt));
}

function parse_br_date(?string $s): ?string
{
    if (!$s) return null;
    if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', trim($s), $m)) {
        return $m[3] . '-' . $m[2] . '-' . $m[1];
    }
    if (preg_match('/^\d{4}-\d{2}-\d{2}/', $s)) return substr($s, 0, 10);
    return null;
}
