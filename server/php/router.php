<?php

$urlPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

switch ($urlPath) {
    case '/ip':
        require 'ip.php';
        break;
    case '/ping':
        require 'ping.php';
        break;
    case '/download':
        require 'download.php';
        break;
    case '/upload':
        require 'upload.php';
        break;

    case '/':
        $urlPath = '/index.html';

    default:
        $file = $_SERVER['DOCUMENT_ROOT'] . $urlPath;
        if (file_exists($file) && is_file($file)) {
            header('Content-Type: '.getMimeType($file));
            header('Content-Length: '.filesize($file));
            readfile($file);
            exit;
        }

        http_response_code(404);
        exit;
}

function getMimeType($file) {
    return [
        'html'=> 'text/html',
        'js' => 'application/javascript',
        'json' => 'application/json',
        'css' => 'text/css'
    ][pathinfo($file, PATHINFO_EXTENSION)] ?? 'application/octet-stream';
}
