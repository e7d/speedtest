#!/usr/bin/env php
<?php

define('BASE_PATH', realpath(dirname(__FILE__)));
spl_autoload_register(function ($className) {
    if (file_exists($className . '.php')) {
        require_once $className . '.php';
        return true;
    }
    return false;
});

$server = new SpeedTestWebSocketServer('0.0.0.0', '9000');
try {
    $server->run();
} catch (Exception $e) {
    $server->stdout($e->getMessage());
}
