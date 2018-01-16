//@ts-check

const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const WebSocketServer = require('websocket').server;
const port = process.argv[2] || 80;
const basePath = process.argv[3] || 'web';

// prepare a random data buffer of 128KB
const buffer = new Buffer(128 * 1024);
for (let bufferIndex = 0; bufferIndex < buffer.byteLength; bufferIndex++) {
    buffer[bufferIndex] = Math.random();
}

const getRandomData = (size = 8) => {
    // build the data array of desired size from the buffer
    const data = new Buffer(size * 1024 * 1024);
    for (let dataIndex = 0; dataIndex * buffer.byteLength < size; dataIndex++) {
        data.set(
            buffer,
            dataIndex * buffer.byteLength
        );
    }

    return data;
};

const server = http.createServer((request, response) => {
    const {
        pathname: uri,
        query: query
    } = url.parse(request.url, true);

    // process HTTP request
    try {
        switch (uri) {
            case '/ip':
                response.writeHead(200);
                response.write(request.connection.remoteAddress);
                response.end();
                break;
            case '/ping':
            case '/upload':
                response.writeHead(200);
                response.write('');
                response.end();
                break;
            case '/download':
                response.writeHead(200, {
                    'Content-Type': 'application/octet-stream'
                });
                response.write(
                    getRandomData(query.size),
                    'binary'
                );
                response.end();
                break;
            default:
                let filename = path.join(process.cwd(), basePath, uri);

                fs.exists(filename, exists => {
                    if (!exists) {
                        response.writeHead(404, {
                            'Content-Type': 'text/plain'
                        });
                        response.write('404 Not Found');
                        response.end();
                        return;
                    }

                    if (fs.statSync(filename).isDirectory()) {
                        filename += 'index.html';
                    }

                    fs.readFile(filename, 'binary', (err, data) => {
                        if (err) {
                            response.writeHead(500, {
                                'Content-Type': 'text/plain'
                            });
                            response.write(err + '\n');
                            response.end();
                            return;
                        }

                        response.writeHead(200);
                        response.write(data, 'binary');
                        response.end();
                    });
                });

                break;
        }
    } catch (err) {
        response.writeHead(500, {
            'Content-Type': 'text/plain'
        });
        response.write(err + '\n');
        response.end();
    }
});
server.listen(port);

console.log('Server running at http://0.0.0.0:' + port + '/');

// create the server
const wsServer = new WebSocketServer({
    httpServer: server,
    maxReceivedFrameSize: 20 * 1024 * 1024
});

// WebSocket server
wsServer.on('request', request => {
    let downloadData;
    const connection = request.accept(null, request.origin);

    // handle messages
    connection.on('message', message => {

        if (message.type === 'utf8') {
            try {
                const data = JSON.parse(message.utf8Data);

                switch (data.action) {
                    case 'prepare':
                        downloadData = getRandomData(data.size);
                        break;

                    case 'download':
                        connection.send(downloadData);
                        break;
                }
            } catch (error) {
                // nothing
            }
        }

        if (message.type === 'binary') {
            connection.send('');
            return;
        }
    });

    connection.on('close', connection => {
        downloadData = null;
    });
});
