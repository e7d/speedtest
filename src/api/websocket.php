#!/usr/bin/env php
<?php

require_once './WebSocketServer.php';

/**
 * Echo server
 */
class SpeedTestServer extends WebSocketServer
{
    public function __construct($addr, $port)
    {
        $this->data = $this->generateRandomString(20 * 1024 * 1024);;
        parent::__construct($addr, $port);
    }

    function generateRandomString($length = 10)
    {
        $characters = '0123456789abcdefghijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $charactersLength = strlen($characters);
        $randomString = '';
        for ($i = 0; $i < $length; $i++) {
            $randomString .= $characters[rand(0, $charactersLength - 1)];
        }
        return $randomString;
    }

    /**
     * Undocumented function
     *
     * @param WebSocketUser $user    The user
     * @param string        $message The message
     *
     * @return void
     */
    protected function process($user, $message)
    {
        $this->send($user, $this->data);
    }

    /**
     * Undocumented function
     *
     * @param WebSocketUser $user The user
     *
     * @return void
     */
    protected function connected($user)
    {
        return;
    }

    /**
     * Undocumented function
     *
     * @param WebSocketUser $user The user
     *
     * @return void
     */
    protected function closed($user)
    {
        return;
    }
}

$echo = new SpeedTestServer("0.0.0.0", "9000");
try {
    $echo->run();
} catch (Exception $e) {
    $echo->stdout($e->getMessage());
}
