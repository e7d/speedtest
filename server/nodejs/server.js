//@ts-check

const fs = require('fs');
const http = require('http');
const ipInfo = require('ipinfo');
const path = require('path');
const requestIp = require('request-ip');
const url = require('url');
const WebSocketServer = require('websocket').server;
const port = process.argv[2] || 80;
const basePath = process.argv[3] || 'web';

// prepare a random data buffer of 128KB
const buffer = Buffer.alloc(128 * 1024);
for (let bufferIndex = 0; bufferIndex < buffer.byteLength; bufferIndex++) {
    buffer[bufferIndex] = Math.random();
}

const getRandomData = (size = 8 * 1024 * 1024) => {
    // build the data array of desired size from the buffer
    const data = Buffer.alloc(size);
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
                const ipRegex = /\:\:ffff\:((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/;
                const ip = ipRegex.test(requestIp.getClientIp(request))
                    ? request.connection.remoteAddress.replace('::ffff:', '')
                    : request.connection.remoteAddress;
                ipInfo(`${ip}/org`, (err, org) => {
                    response.writeHead(200);
                    response.write(org ? `${ip} (${org})` : ip);
                    response.end();
                });
                break;
            case '/ping':
            case '/upload':
                response.writeHead(200);
                response.end();
                break;
            case '/download':
                response.writeHead(200, {
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': +query.size
                });
                response.write(
                    getRandomData(+query.size),
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
                        response.write('Not Found');
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
                            response.write(err.message);
                            response.end();
                            return;
                        }

                        let contentType = 'text/plain';
                        switch(path.extname(filename)) {
                            case '.css':
                                contentType = 'text/css';
                                break;
                            case '.html':
                                contentType = 'text/html';
                                break;
                            case '.js':
                                contentType = 'application/javascript';
                                break;
                        }
                        response.writeHead(200, {
                            'Content-Type': contentType,
                            'Content-Length': data.length
                        });
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
        response.write(err);
        response.end();
    }
});
server.listen(port);

if (!server.listening) {
    throw new Error(`Server failed listening on port ${port}`);
}

console.log(`Server listening at http://0.0.0.0:${port}/`);

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
                    case 'ping':
                        connection.send(JSON.stringify({
                            action: 'pong',
                            index: data.index
                        }));
                        break;

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
