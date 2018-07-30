//@ts-check

const fs = require("fs");
const http = require("http");
const ipInfo = require("ipinfo");
const path = require("path");
const requestIp = require("request-ip");
const url = require("url");
const WebSocketServer = require("websocket").server;
const port = process.argv[2] || 80;
const basePath = process.argv[3] || "web";

process.on("SIGINT", function() {
    process.exit();
});

function getBuffer(size = 128 * 1024) {
    const buffer = Buffer.alloc(size);
    for (let bufferIndex = 0; bufferIndex < buffer.byteLength; bufferIndex++) {
        buffer[bufferIndex] = Math.random();
    }
    return buffer;
}

function getRandomData(size = 8 * 1024 * 1024, bufferSize = 128 * 1024) {
    const buffer = getBuffer(bufferSize);
    const data = Buffer.alloc(size);
    for (let dataIndex = 0; dataIndex * buffer.byteLength < size; dataIndex++) {
        data.set(buffer, dataIndex * buffer.byteLength);
    }
    return data;
}

function writeIP(request, response) {
    const ipRegex = /\:\:ffff\:((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/;
    const ip = ipRegex.test(requestIp.getClientIp(request))
        ? request.connection.remoteAddress.replace("::ffff:", "")
        : request.connection.remoteAddress;
    ipInfo(`${ip}/org`, (err, org) => {
        response.writeHead(200);
        response.write(org ? `${ip} (${org})` : ip);
        response.end();
    });
}

function loadFile(uri, response) {
    let filename = path.join(process.cwd(), basePath, uri);

    fs.exists(filename, exists => {
        if (!exists) {
            response.writeHead(404, {
                "Content-Type": "text/plain"
            });
            response.write("Not Found");
            response.end();
            return;
        }

        if (fs.statSync(filename).isDirectory()) {
            filename += "index.html";
        }

        fs.readFile(filename, "binary", (err, data) => {
            if (err) {
                response.writeHead(500, {
                    "Content-Type": "text/plain"
                });
                response.write(err.message);
                response.end();
                return;
            }

            let contentType = "text/plain";
            switch (path.extname(filename)) {
                case ".css":
                    contentType = "text/css";
                    break;
                case ".html":
                    contentType = "text/html";
                    break;
                case ".js":
                    contentType = "application/javascript";
                    break;
            }
            response.writeHead(200, {
                "Content-Type": contentType,
                "Content-Length": data.length
            });
            response.write(data, "binary");
            response.end();
        });
    });
}

const httpServer = http
    .createServer((request, response) => {
        const { pathname: uri, query: query } = url.parse(request.url, true);

        try {
            switch (uri) {
                case "/ip":
                    writeIP(request, response);
                    break;
                case "/ping":
                case "/upload":
                    response.writeHead(200);
                    response.end();
                    break;
                case "/download":
                    const data = getRandomData(+query.size);
                    response.writeHead(200, {
                        "Content-Type": "application/octet-stream",
                        "Content-Length": data.byteLength
                    });
                    response.write(data, "binary");
                    response.end();
                    break;
                default:
                    loadFile(uri, response);
                    break;
            }
        } catch (err) {
            response.writeHead(500, {
                "Content-Type": "text/plain"
            });
            response.write(err.message);
            response.end();
        }
    })
    .listen(port);

if (!httpServer.listening) {
    throw new Error(`Server failed listening on port ${port}`);
}
console.log(`Server listening at http://0.0.0.0:${port}/`);

const wsServer = new WebSocketServer({
    httpServer,
    maxReceivedFrameSize: 20 * 1024 * 1024
}).on("request", request => {
    let downloadData;
    const connection = request.accept(null, request.origin);

    // handle messages
    connection.on("message", message => {
        if (message.type === "utf8") {
            try {
                const data = JSON.parse(message.utf8Data);

                switch (data.action) {
                    case "ping":
                        connection.send(
                            JSON.stringify({
                                action: "pong",
                                index: data.index
                            })
                        );
                        break;
                    case "prepare":
                        downloadData = getRandomData(data.size);
                        break;
                    case "download":
                        connection.send(downloadData);
                        break;
                }
            } finally {
            }
        }

        if (message.type === "binary") {
            connection.send("");
            return;
        }
    });

    connection.on("close", connection => {
        downloadData = null;
    });
});
