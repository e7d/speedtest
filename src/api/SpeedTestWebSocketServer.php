<?php

/**
 * Echo server
 */
class SpeedTestWebSocketServer extends WebSocketServer
{
    /**
     * The binary data chunk size.
     *
     * @var int
     */
    private $chunkSize = 16 * 1024;

    /**
     * The random text data.
     *
     * @var string
     */
    private $data;

    /**
     * Creates a SpeedTest server instance
     *
     * @param string $addr The server address
     * @param port   $port The serer port
     */
    public function __construct(string $addr = '0.0.0.0', int $port = 9000)
    {
        // Generate 20MB of random data
        $size = 20 * 1024 * 1024;
        $this->data = $this->generateRandomData($size);

        parent::__construct($addr, $port);
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
        try {
            // decode input message as JSON
            $message = json_decode($message);

            if (is_null($message)) {
                echo "not JSON\n";

                $this->send($user, '', 'text');
                return;

                $message = new \stdClass();
                $message->action = 'upload';
            }

            switch ($message->action) {
                case 'prepare':
                    $this->prepareRandomData($user, $message->size);
                    break;
                case 'download':
                    $this->sendRandomData($user);
                    break;
                case 'upload':
                    $this->receiveRandomData($user);
                    break;
            }
        } catch (Exception $e) {
            return;
        }
    }

    public function connected($user)
    {
        echo "[$user->id] connected\n";
    }

    public function closed($user)
    {
        echo "[$user->id] left\n";
    }

    /**
     * Undocumented function
     *
     * @param int $size The required random data length
     *
     * @return string
     */
    private function generateRandomData(int $size)
    {
        $randomData = '';

        // Assemble enough chunks to reach required size
        do {
            // Generate a chunk of random data
            $chunk = openssl_random_pseudo_bytes($this->chunkSize);
            $randomData .= $chunk;
        } while (strlen($randomData) < $size);

        return $randomData;
    }

    private function prepareRandomData($user, $size)
    {
        // save the data size for this user
        $user->data = $size * (1024 * 1024);
    }

    private function sendRandomData($user)
    {
        // send data of desired side to this user
        $this->send(
            $user,
            substr($this->data, 0, $user->data),
            'binary'
        );
    }

    private function receiveRandomData($user)
    {
        echo "receive random data\n";

        // acknowledge data upload to this user with an empty packet
        $this->send($user, '');
    }
}
