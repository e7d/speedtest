<?php

$urlPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
switch ($urlPath) {
    case '/ip':
        getIP();
        break;
    case '/ping':
        setEmpty();
        break;
    case '/download':
        getData();
        break;
    case '/upload':
        setEmpty();
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
}

function getData() {
    set_time_limit(0);
    @ini_set('zlib.output_compression', 'Off');
    @ini_set('output_buffering', 'Off');
    @ini_set('output_handler', '');

    $size = $_GET['size'] ?? 8 * 1024 *1024;
    $chunkSize = $_GET['chunkSize'] ?? 64 * 1024;
    $chunks = $size / $chunkSize;

    header('Content-Type: application/octet-stream');
    $data = implode('', array_fill(0, $chunkSize, "\0"));
    for ($i = 0; $i < $chunks; $i++) {
        print $data;
        flush();
    }
}

function getIP() {
    header('HTTP/1.1 200 OK');
    print $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['HTTP_X_REAL_IP'] ?? $_SERVER['REMOTE_ADDR'];
}

function setEmpty() {
}

function getMimeType($file) {
    return [
        'css' => 'text/css',
        'html'=> 'text/html',
        'js' => 'application/javascript',
        'json' => 'application/json'
    ][pathinfo($file, PATHINFO_EXTENSION)] ?? 'application/octet-stream';
}
