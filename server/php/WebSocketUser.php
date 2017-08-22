<?php

/**
 * WebSocket User
 */
class WebSocketUser
{
    public $socket;
    public $id;
    public $data;
    public $headers = array();
    public $handshake = false;
    public $handlingPartialPacket = false;
    public $partialBuffer = "";
    public $sendingContinuous = false;
    public $partialMessage = "";
    public $hasSentClose = false;

    /**
     * Creates a user.
     *
     * @param string          $id     The user id
     * @param WebSocketServer $socket The reference socket
     */
    function __construct($id, $socket)
    {
        $this->id = $id;
        $this->socket = $socket;
    }
}
