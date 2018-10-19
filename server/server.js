//@ts-check

const fs = require("fs");
const http = require("http");
const path = require("path");
const requestIp = require("request-ip");
const url = require("url");
const WebSocketServer = require("websocket").server;

const port = process.argv[2] || 80;
const basePath = process.argv[3] || "web";

process.on("SIGINT", function() {
    process.exit();
});
function* getData(query) {
    const data = Buffer.alloc(+query.chunkSize);
    const chunks = +query.size / +query.chunkSize;
    for (let index = 0; index < chunks; index++) {
        yield data;
    }
}

function getIP(request) {
    const ipRegex = /\:\:ffff\:((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/;
    return ipRegex.test(requestIp.getClientIp(request))
        ? request.connection.remoteAddress.replace("::ffff:", "")
        : request.connection.remoteAddress;
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
                case ".svg":
                    contentType = "image/svg+xml";
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
                    response.writeHead(200);
                    response.write(getIP(request));
                    response.end();
                    break;
                case "/ping":
                case "/upload":
                    response.writeHead(200);
                    response.end();
                    break;
                case "/download":
                    response.writeHead(200, {
                        "Content-Type": "application/octet-stream"
                        // "Content-Length": data.byteLength
                    });
                    for (let chunk of getData({
                        size: 8 * 1024 * 1024,
                        chunkSize: 64 * 1024,
                        ...query
                    })) {
                        response.write(chunk, "binary");
                    }
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

new WebSocketServer({
    httpServer,
    maxReceivedFrameSize: 20 * 1024 * 1024
}).on("request", request => {
    let downloadData = "";
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
                        for (let chunk of getData({
                            size: 8 * 1024 * 1024,
                            chunkSize: 64 * 1024,
                            ...data
                        })) {
                            downloadData += chunk;
                        }
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

    connection.on("close", () => {
        downloadData = null;
    });
});
