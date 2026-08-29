<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/api/lib/app.php';

function saidera_v(): string
{
    return '14';
}

function saidera_proteger(string $papel): void
{
    if (!saidera_instalado()) {
        header('Location: ../instalar.php');
        exit;
    }
    try {
        saidera_app();
        $u = auth_user();
    } catch (Throwable $e) {
        header('Location: ../index.php');
        exit;
    }
    if (!$u) {
        header('Location: ../index.php');
        exit;
    }
    if ($u['papel'] !== $papel) {
        header('Location: ../' . saidera_pagina_papel($u['papel']));
        exit;
    }
}
