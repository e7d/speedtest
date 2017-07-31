const WebSocket = require('ws');

const server = new WebSocket.Server({
    port: 9000,
    perMessageDeflate: false
});

server.on('connection', socket => {
    socket.on('message', message => {
        if (message instanceof Buffer) {
            socket.send('');
            return;
        }

        try {
            message = JSON.parse(message);

            switch (message.action) {
                case 'prepare':
                    socket.downloadData = getRandomData(message.size);
                    break;

                case 'download':
                    socket.send(socket.downloadData);
                    break;
            }
        } catch (error) {
            // nothing
        }
    });

    socket.on('close', (code, reason) => {
        socket.downloadData = null;
    });
});

const getRandomData = (size) => {
    // prepare a random data buffer of 1MB
    const buffer = new Float32Array(new ArrayBuffer(1048576));
    for (var index = 0; index < buffer.length; index++) {
        buffer[index] = Math.random();
    }

    // build the data array of desired size from the 1MB buffer
    const data = new Float32Array(buffer.length * size);
    for (let i = 0; i < size; i++) {
        data.set(
            buffer,
            i * buffer.length
        );
    }

    return data;
};
