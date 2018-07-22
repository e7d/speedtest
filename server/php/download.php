<?php

// remove max execution time
set_time_limit(0);

// Disable Compression
@ini_set('zlib.output_compression', 'Off');
@ini_set('output_buffering', 'Off');
@ini_set('output_handler', '');

// Read input
$size = $_GET['size'] ?? INF;
$chunkSize = $_GET['chunkSize'] ?? 64 * 1024;
$chunks = $size / $chunkSize;

// Headers
header('HTTP/1.1 200 OK');

// Force download as binary
header('Content-Description: File Transfer');
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename=random.dat');
header('Content-Transfer-Encoding: binary');
if ($size !== INF) {
    header('Content-Length: ' . $size);
}

// Disable cache
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');

// Generate 1M chunk of random data
$data = random_bytes($chunkSize);

// Assemble enough chunks to reach required size
for ($i = 0; $i < $chunks; $i++) {
    print $data;
    flush();
}
