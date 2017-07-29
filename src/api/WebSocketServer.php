<?php

require_once './WebSocketUser.php';

/**
 * WebSocket Server
 *
 * @category WebSocket
 * @package  PHP-Websockets
 * @author   ghedipunk <ghedipunk@github.com>
 * @license  BSD-3 https://raw.githubusercontent.com/ghedipunk/PHP-Websockets/master/license.txt
 * @link     https://github.com/ghedipunk/PHP-Websockets
 */
abstract class WebSocketServer
{

    protected $maxBufferSize;
    protected $master;
    protected $sockets = array();
    protected $users = array();
    protected $heldMessages = array();
    protected $interactive = false;
    protected $headerOriginRequired = false;
    protected $headerProtocolRequired = false;
    protected $headerExtensionsRequired = false;

    /**
     * Create a WebSocket Server
     *
     * @param string  $addr         The server address
     * @param int     $port         The server port
     * @param integer $bufferLength The maximum buffer length
     */
    function __construct($addr, $port, $bufferLength = 2048)
    {
        $this->maxBufferSize = $bufferLength;
        $this->master = socket_create(
            AF_INET, SOCK_STREAM, SOL_TCP
        ) or die("Failed: socket_create()");
        socket_set_option(
            $this->master,
            SOL_SOCKET, SO_REUSEADDR,
            1
        ) or die("Failed: socket_option()");
        socket_bind(
            $this->master,
            $addr,
            $port
        ) or die("Failed: socket_bind()");
        socket_listen(
            $this->master,
            20
        ) or die("Failed: socket_listen()");
        $this->sockets['m'] = $this->master;
        $this->stdout(
            "Server started\n".
            "Listening on: $addr:$port\n".
            "Master socket: ".$this->master
        );
    }

    /**
     * Called immediately when the data is recieved.
     *
     * @param WebSocketUser $user    The WebSocket user
     * @param string        $message The WebSocket message
     *
     * @return void
     */
    abstract protected function process($user, $message);

    /**
     * Called after the handshake response is sent to the client.
     *
     * @param WebSocketUser $user The WebSocket user
     *
     * @return void
     */
    abstract protected function connected($user);

    /**
     * Called after the connection is closed.
     *
     * @param WebSocketUser $user The WebSocket user
     *
     * @return void
     */
    abstract protected function closed($user);

    /**
     * Send a message.
     *
     * @param WebSocketUser $user    The WebSocket user
     * @param string        $message The WebSocket message
     *
     * @return void
     */
    protected function send($user, $message)
    {
        if ($user->handshake) {
            $message = $this->frame($message, $user);
            @socket_write($user->socket, $message, strlen($message));
            return;
        }

        // User has not yet performed their handshake.  Store for sending later.
        $holdingMessage = array('user' => $user, 'message' => $message);
        $this->heldMessages[] = $holdingMessage;
    }

    /**
     * Called when connection is establishing.
     *
     * @param WebSocketUser $user The WebSocket user
     *
     * @return void
     */
    protected function connecting($user)
    {
        return;
    }

    /**
     * Override this for any process that should happen periodically.
     *
     * @return void
     */
    protected function ticked()
    {
        // Will happen at least once per second, but possibly more often.
    }

    /**
     * Core maintenance processes, such as retrying failed messages.
     *
     * @return void
     */
    protected function tick()
    {
        foreach ($this->heldMessages as $key => $hm) {
            $found = false;
            foreach ($this->users as $currentUser) {
                if ($hm['user']->socket == $currentUser->socket) {
                    $found = true;
                    if ($currentUser->handshake) {
                        unset($this->heldMessages[$key]);
                        $this->send($currentUser, $hm['message']);
                    }
                }
            }
            if (!$found) {
                // If they're no longer in the list of connected users, drop the message.
                unset($this->heldMessages[$key]);
            }
        }
    }

    /**
     * Main processing loop
     *
     * @return void
     */
    public function run()
    {
        while (true) {
            if (empty($this->sockets)) {
                $this->sockets['m'] = $this->master;
            }
            $read = $this->sockets;
            $write = $except = null;
            $this->tick();
            $this->tick();
            @socket_select($read, $write, $except, 1);
            foreach ($read as $socket) {
                if ($socket == $this->master) {
                    $client = socket_accept($socket);
                    if ($client < 0) {
                        $this->stderr("Failed: socket_accept()");
                        continue;
                    }

                    $this->connect($client);
                    $this->stdout("Client connected. " . $client);
                    continue;
                }

                $numBytes = @socket_recv($socket, $buffer, $this->maxBufferSize, 0);
                if ($numBytes === false) {
                    $sockErrNo = socket_last_error($socket);
                    $this->handleError($socket, $sockErrNo);
                    continue;
                }

                if ($numBytes == 0) {
                    $this->disconnect($socket);
                    $this->stderr("Client disconnected. TCP connection lost: " . $socket);
                    continue;
                }

                $user = $this->getUserBySocket($socket);
                if (!$user->handshake) {
                    $tmp = str_replace("\r", '', $buffer);
                    if (strpos($tmp, "\n\n") === false) {
                        continue; // If the client has not finished sending the header, then wait before sending our upgrade response.
                    }
                    $this->doHandshake($user, $buffer);
                    continue;
                }

                //split packet into frame and send it to deframe
                $this->splitPacket($numBytes, $buffer, $user);
            }
        }
    }

    /**
     * Handles a socket error.
     *
     * @param resource $socket    The WebSocket connection socket
     * @param int      $sockErrNo The WebSocket error number
     *
     * @return void
     */
    protected function handleError($socket, $sockErrNo)
    {
        switch ($sockErrNo) {
            case 102:
                // ENETRESET    -- Network dropped connection because of reset
            case 103:
                // ECONNABORTED -- Software caused connection abort
            case 104:
                // ECONNRESET   -- Connection reset by peer
            case 108:
                // ESHUTDOWN    -- Cannot send after transport endpoint shutdown
                // probably more of an error on our part,
                // if we're trying to write after the socket is closed.
                // Probably not a critical error, though.
            case 110:
                // ETIMEDOUT    -- Connection timed out
            case 111:
                // ECONNREFUSED -- Connection refused -- We shouldn't see this one,
                // since we're listening... Still not a critical error.
            case 112:
                // EHOSTDOWN    -- Host is down -- Again, we shouldn't see this,
                // and again, not critical because it's just one connection
                // and we still want to listen to/for others.
            case 113:
                // EHOSTUNREACH -- No route to host
            case 121:
                // EREMOTEIO    -- Rempte I/O error -- Their hard drive just blew up.
            case 125:
                $this->stderr("Unusual disconnect on socket " . $socket);
                // disconnect before clearing error,
                // in case someone with their own implementation
                // wants to check for error conditions on the socket.
                $this->disconnect($socket, true, $sockErrNo);
                break;
            default:
                $this->stderr('Socket error: ' . socket_strerror($sockErrNo));
        }
    }

    /**
     * Connects a socket.
     *
     * @param resource $socket The WebSocket connection socket
     *
     * @return void
     */
    protected function connect($socket)
    {
        $user = new WebSocketUser(uniqid('u'), $socket);
        $this->users[$user->id] = $user;
        $this->sockets[$user->id] = $socket;
        $this->connecting($user);
    }

    /**
     * Disconnects a socket.
     *
     * @param resource $socket        The WebSocket connection socket
     * @param boolean  $triggerClosed The client disconnected or not
     * @param int      $sockErrNo     The WebSocket error number
     *
     * @return void
     */
    protected function disconnect($socket, $triggerClosed = true, $sockErrNo = null)
    {
        $disconnectedUser = $this->getUserBySocket($socket);

        if ($disconnectedUser !== null) {
            unset($this->users[$disconnectedUser->id]);

            if (array_key_exists($disconnectedUser->id, $this->sockets)) {
                unset($this->sockets[$disconnectedUser->id]);
            }

            if (!is_null($sockErrNo)) {
                socket_clear_error($socket);
            }

            if ($triggerClosed) {
                $this->stdout("Client disconnected. ".$disconnectedUser->socket);
                $this->closed($disconnectedUser);
                socket_close($disconnectedUser->socket);
                return;
            }

            $message = $this->frame('', $disconnectedUser, 'close');
            @socket_write($disconnectedUser->socket, $message, strlen($message));
        }
    }

    /**
     * Gives the handshake for a user.
     *
     * @param WebSocketUser $user   The WebSocket user
     * @param string        $buffer The handshake buffer
     *
     * @return void
     */
    protected function doHandshake($user, $buffer)
    {
        $magicGUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
        $headers = array();
        $lines = explode("\n", $buffer);
        foreach ($lines as $line) {
            if (strpos($line, ":") !== false) {
                $header = explode(":", $line, 2);
                $headers[strtolower(trim($header[0]))] = trim($header[1]);
            } elseif (stripos($line, "get ") !== false) {
                preg_match("/GET (.*) HTTP/i", $buffer, $reqResource);
                $headers['get'] = trim($reqResource[1]);
            }
        }
        if (isset($headers['get'])) {
            $user->requestedResource = $headers['get'];
        } else {
            // todo: fail the connection
            $handshakeResponse = "HTTP/1.1 405 Method Not Allowed\r\n\r\n";
        }
        if (!isset($headers['host']) || !$this->checkHost($headers['host'])) {
            $handshakeResponse = "HTTP/1.1 400 Bad Request";
        }
        if (!isset($headers['upgrade']) || strtolower($headers['upgrade']) != 'websocket') {
            $handshakeResponse = "HTTP/1.1 400 Bad Request";
        }
        if (!isset($headers['connection']) || strpos(strtolower($headers['connection']), 'upgrade') === false) {
            $handshakeResponse = "HTTP/1.1 400 Bad Request";
        }
        if (!isset($headers['sec-websocket-key'])) {
            $handshakeResponse = "HTTP/1.1 400 Bad Request";
        }
        if (!isset($headers['sec-websocket-version']) || strtolower($headers['sec-websocket-version']) != 13) {
            $handshakeResponse = "HTTP/1.1 426 Upgrade Required\r\nSec-WebSocketVersion: 13";
        }
        if (($this->headerOriginRequired && !isset($headers['origin']) ) || ($this->headerOriginRequired && !$this->checkOrigin($headers['origin']))) {
            $handshakeResponse = "HTTP/1.1 403 Forbidden";
        }
        if (($this->headerProtocolRequired && !isset($headers['sec-websocket-protocol'])) || ($this->headerProtocolRequired && !$this->checkWebsocketProtocol($headers['sec-websocket-protocol']))) {
            $handshakeResponse = "HTTP/1.1 400 Bad Request";
        }
        if (($this->headerExtensionsRequired && !isset($headers['sec-websocket-extensions'])) || ($this->headerExtensionsRequired && !$this->checkWebsocketExtensions($headers['sec-websocket-extensions']))) {
            $handshakeResponse = "HTTP/1.1 400 Bad Request";
        }

        // Done verifying the _required_ headers and optionally required headers.

        if (isset($handshakeResponse)) {
            socket_write($user->socket, $handshakeResponse, strlen($handshakeResponse));
            $this->disconnect($user->socket);
            return;
        }

        $user->headers = $headers;
        $user->handshake = $buffer;

        $webSocketKeyHash = sha1($headers['sec-websocket-key'] . $magicGUID);

        $rawToken = "";
        for ($i = 0; $i < 20; $i++) {
            $rawToken .= chr(hexdec(substr($webSocketKeyHash, $i*2, 2)));
        }
        $handshakeToken = base64_encode($rawToken) . "\r\n";

        $subProtocol = (isset($headers['sec-websocket-protocol'])) ? $this->processProtocol($headers['sec-websocket-protocol']) : "";
        $extensions = (isset($headers['sec-websocket-extensions'])) ? $this->processExtensions($headers['sec-websocket-extensions']) : "";

        $handshakeResponse = "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: $handshakeToken$subProtocol$extensions\r\n";
        socket_write($user->socket, $handshakeResponse, strlen($handshakeResponse));
        $this->connected($user);
    }

    /**
     * Checks the hostname.
     * Override and return false if the host is not one that you would expect.
     * i.e.: You only want to accept hosts from the my-domain.com domain,
     * but you receive a host from malicious-site.com instead.
     *
     * @param string $hostName The host name to check
     *
     * @return bool
     */
    protected function checkHost($hostName)
    {
        return true;
    }

    /**
     * Checks the origin.
     * Override and return false if the origin is not one that you would expect.
     *
     * @param string $origin The origin to check
     *
     * @return bool
     */
    protected function checkOrigin($origin)
    {
        return true;
    }

    /**
     * Checks the protocol.
     * Override and return false if a protocol is not what you expect to find.
     *
     * @param string $protocol The protocol to check
     *
     * @return bool
     */
    protected function checkWebsocketProtocol($protocol)
    {
        return true;
    }

    /**
     * Checks the extensions.
     * Override and return false if an extension is not what you expect to find.
     *
     * @param string $extensions The extensions to check
     *
     * @return bool
     */
    protected function checkWebsocketExtensions($extensions)
    {
        return true; //
    }

    /**
     * Processes the procol.
     *
     * @param string $protocol The protocol to process
     *
     * @return string
     */
    protected function processProtocol($protocol)
    {
        return "";
        // return either "Sec-WebSocket-Protocol: SelectedProtocolFromClientList\r\n"
        // or return an empty string.
        // The CRLF combo must appear at the end of a non-empty string,
        // and must not appear at the beginning of the string nor in an otherwise
        // empty string, or it will be considered part of the response body,
        // which will trigger an error in the client as it will not be
        // formatted correctly.
    }

    /**
     * Processes the extensions header.
     *
     * @param string $extensions The extensions to process
     *
     * @return string
     */
    protected function processExtensions($extensions)
    {
        return "";
        // return either "Sec-WebSocket-Extensions: SelectedExtensions\r\n" or return an empty string.
    }

    /**
     * Gets a user for a socket.
     *
     * @param resource $socket The WebSocket connection socket
     *
     * @return void
     */
    protected function getUserBySocket($socket)
    {
        foreach ($this->users as $user) {
            if ($user->socket == $socket) {
                return $user;
            }
        }
        return null;
    }

    /**
     * Outputs a standard message.
     *
     * @param string $message The WebSocket message
     *
     * @return void
     */
    public function stdout($message)
    {
        if ($this->interactive) {
            echo "$message\n";
        }
    }

    /**
     * Outputs an error message.
     *
     * @param string $message The WebSocket message
     *
     * @return void
     */
    public function stderr($message)
    {
        if ($this->interactive) {
            echo "$message\n";
        }
    }

    /**
     * Frames a message for a user, depending of its type an continuation status.
     *
     * @param string        $message          The WebSocket message
     * @param WebSocketUser $user             The WebSocket user
     * @param string        $messageType      The WebSocket message type
     * @param boolean       $messageContinues The WebSocket is continuing
     *
     * @return void
     */
    protected function frame($message, $user, $messageType = 'text', $messageContinues = false)
    {
        switch ($messageType) {
            case 'continuous':
                $byte1 = 0;
                break;
            case 'text':
                $byte1 = ($user->sendingContinuous) ? 0 : 1;
                break;
            case 'binary':
                $byte1 = ($user->sendingContinuous) ? 0 : 2;
                break;
            case 'close':
                $byte1 = 8;
                break;
            case 'ping':
                $byte1 = 9;
                break;
            case 'pong':
                $byte1 = 10;
                break;
        }
        if ($messageContinues) {
            $user->sendingContinuous = true;
        } else {
            $byte1 += 128;
            $user->sendingContinuous = false;
        }

        $length = strlen($message);
        $lengthField = "";
        if ($length < 126) {
            $byte2 = $length;
        } elseif ($length < 65536) {
            $byte2 = 126;
            $hexLength = dechex($length);
            //$this->stdout("Hex Length: $hexLength");
            if (strlen($hexLength)%2 == 1) {
                $hexLength = '0' . $hexLength;
            }
            $n = strlen($hexLength) - 2;

            for ($i = $n; $i >= 0; $i = $i-2) {
                $lengthField = chr(hexdec(substr($hexLength, $i, 2))) . $lengthField;
            }
            while (strlen($lengthField) < 2) {
                $lengthField = chr(0) . $lengthField;
            }
        } else {
            $byte2 = 127;
            $hexLength = dechex($length);
            if (strlen($hexLength)%2 == 1) {
                $hexLength = '0' . $hexLength;
            }
            $n = strlen($hexLength) - 2;

            for ($i = $n; $i >= 0; $i = $i-2) {
                $lengthField = chr(hexdec(substr($hexLength, $i, 2))) . $lengthField;
            }
            while (strlen($lengthField) < 8) {
                $lengthField = chr(0) . $lengthField;
            }
        }

        return chr($byte1) . chr($byte2) . $lengthField . $message;
    }

    /**
     * Checks packet if he have more than one frame,
     * and process each frame individually.
     *
     * @param int           $length The pacjket length
     * @param string        $packet The packet to split
     * @param WebSocketUser $user   The WebSocket user
     *
     * @return void
     */
    protected function splitPacket($length, $packet, $user)
    {
        // add PartialPacket and calculate the new $length
        if ($user->handlingPartialPacket) {
            $packet = $user->partialBuffer . $packet;
            $user->handlingPartialPacket = false;
            $length = strlen($packet);
        }
        $fullpacket = $packet;
        $framePos = 0;
        $frameId = 1;

        while ($framePos<$length) {
            $headers = $this->extractHeaders($packet);
            $headersSize = $this->calcOffset($headers);
            $framesize = $headers['length']+$headersSize;

            // split frame from packet and process it
            $frame = substr($fullpacket, $framePos, $framesize);

            if (($message = $this->deframe($frame, $user, $headers)) !== false) {
                if ($user->hasSentClose) {
                    $this->disconnect($user->socket);
                } else {
                    if ((preg_match('//u', $message)) || ($headers['opcode'] == 2)) {
                        //$this->stdout("Text msg encoded UTF-8 or Binary msg\n".$message);
                        $this->process($user, $message);
                    } else {
                        $this->stderr("not UTF-8\n");
                    }
                }
            }

            // get the new position also modify packet data
            $framePos += $framesize;
            $packet = substr($fullpacket, $framePos);
            $frameId++;
        }
    }

    /**
     * Calculates the headers offset
     *
     * @param array $headers The headers to compute
     *
     * @return void
     */
    protected function calcOffset($headers)
    {
        $offset = 2;
        if ($headers['hasmask']) {
            $offset += 4;
        }
        if ($headers['length'] > 65535) {
            $offset += 8;
        } elseif ($headers['length'] > 125) {
            $offset += 2;
        }
        return $offset;
    }

    /**
     * Deframes a message and updates the corresponding user.
     *
     * @param string        $message The WebSocket message
     * @param WebSocketUser $user    The WebSocket user
     *
     * @return void
     */
    protected function deframe($message, &$user)
    {
        $headers = $this->extractHeaders($message);
        $pongReply = false;
        $willClose = false;
        switch ($headers['opcode']) {
            case 0:
            case 1:
            case 2:
                break;
            case 8:
                // todo: close the connection
                $user->hasSentClose = true;
                return "";
            case 9:
                $pongReply = true;
            case 10:
                break;
            default:
                //$this->disconnect($user); // todo: fail connection
                $willClose = true;
                break;
        }

        /* Deal by splitPacket() as now deframe() do only one frame at a time.
        if ($user->handlingPartialPacket) {
            $message = $user->partialBuffer . $message;
            $user->handlingPartialPacket = false;
            return $this->deframe($message, $user);
        }
        */

        if ($this->checkRSVBits($headers, $user)) {
            return false;
        }

        if ($willClose) {
            // todo: fail the connection
            return false;
        }

        $payload = $user->partialMessage . $this->extractPayload($message, $headers);

        if ($pongReply) {
            $reply = $this->frame($payload, $user, 'pong');
            socket_write($user->socket, $reply, strlen($reply));
            return false;
        }
        if ($headers['length'] > strlen($this->applyMask($headers, $payload))) {
            $user->handlingPartialPacket = true;
            $user->partialBuffer = $message;
            return false;
        }

        $payload = $this->applyMask($headers, $payload);

        if ($headers['fin']) {
            $user->partialMessage = "";
            return $payload;
        }
        $user->partialMessage = $payload;
        return false;
    }

    /**
     * Extracts the headers from a message.
     *
     * @param string $message The WebSocket message
     *
     * @return void
     */
    protected function extractHeaders($message)
    {
        $header = array('fin'     => $message[0] & chr(128),
            'rsv1'    => $message[0] & chr(64),
            'rsv2'    => $message[0] & chr(32),
            'rsv3'    => $message[0] & chr(16),
            'opcode'  => ord($message[0]) & 15,
            'hasmask' => $message[1] & chr(128),
            'length'  => 0,
            'mask'    => "");
        $header['length'] = (ord($message[1]) >= 128) ? ord($message[1]) - 128 : ord($message[1]);

        if ($header['length'] == 126) {
            if ($header['hasmask']) {
                $header['mask'] = $message[4] . $message[5] . $message[6] . $message[7];
            }
            $header['length'] = ord($message[2]) * 256
                + ord($message[3]);
        } elseif ($header['length'] == 127) {
            if ($header['hasmask']) {
                $header['mask'] = $message[10] . $message[11] . $message[12] . $message[13];
            }
            $header['length'] = ord($message[2]) * 65536 * 65536 * 65536 * 256
                + ord($message[3]) * 65536 * 65536 * 65536
                + ord($message[4]) * 65536 * 65536 * 256
                + ord($message[5]) * 65536 * 65536
                + ord($message[6]) * 65536 * 256
                + ord($message[7]) * 65536
                + ord($message[8]) * 256
                + ord($message[9]);
        } elseif ($header['hasmask']) {
            $header['mask'] = $message[2] . $message[3] . $message[4] . $message[5];
        }
        return $header;
    }

    /**
     * Extracts the payload from a message and its headers.
     *
     * @param string $message The WebSocket message
     * @param array  $headers The headers
     *
     * @return void
     */
    protected function extractPayload($message, $headers)
    {
        $offset = 2;
        if ($headers['hasmask']) {
            $offset += 4;
        }
        if ($headers['length'] > 65535) {
            $offset += 8;
        } elseif ($headers['length'] > 125) {
            $offset += 2;
        }
        return substr($message, $offset);
    }

    /**
     * Apply a bit mask on a payload, depending on headers.
     *
     * @param array  $headers The headers
     * @param string $payload The payload
     *
     * @return void
     */
    protected function applyMask($headers, $payload)
    {
        $effectiveMask = "";
        if ($headers['hasmask']) {
            $mask = $headers['mask'];
        } else {
            return $payload;
        }

        while (strlen($effectiveMask) < strlen($payload)) {
            $effectiveMask .= $mask;
        }
        while (strlen($effectiveMask) > strlen($payload)) {
            $effectiveMask = substr($effectiveMask, 0, -1);
        }
        return $effectiveMask ^ $payload;
    }

    /**
     * Override this method if you are using an extension
     * where the RSV bits are used.
     *
     * @param array         $headers The headers
     * @param WebSocketUser $user    The WebSocket user
     *
     * @return void
     */
    protected function checkRSVBits($headers, $user)
    {
        if (ord($headers['rsv1']) + ord($headers['rsv2']) + ord($headers['rsv3']) > 0) {
            //$this->disconnect($user); // todo: fail connection
            return true;
        }
        return false;
    }

    /**
     * Converts a string to hexadecimal.
     *
     * @param string $str The string to convert
     *
     * @return void
     */
    protected function strtohex($str)
    {
        $strout = "";
        for ($i = 0; $i < strlen($str); $i++) {
            $strout .= (ord($str[$i])<16) ? "0" . dechex(ord($str[$i])) : dechex(ord($str[$i]));
            $strout .= " ";
            if ($i%32 == 7) {
                $strout .= ": ";
            }
            if ($i%32 == 15) {
                $strout .= ": ";
            }
            if ($i%32 == 23) {
                $strout .= ": ";
            }
            if ($i%32 == 31) {
                $strout .= "\n";
            }
        }
        return $strout . "\n";
    }

    /**
     * Prints headers.
     *
     * @param array $headers The headers to print
     *
     * @return void
     */
    protected function printHeaders($headers)
    {
        echo "Array\n(\n";
        foreach ($headers as $key => $value) {
            if ($key == 'length' || $key == 'opcode') {
                echo "\t[$key] => $value\n\n";
                continue;
            }

            echo "\t[$key] => ".$this->strtohex($value)."\n";
        }
        echo ")\n";
    }
}
