//@ts-check

const fs = require("fs");
const http = require("http");
const ipInfo = require("ipinfo");
const path = require("path");
const requestIp = require("request-ip");
const url = require("url");
const uuid = require("uuid");
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
    const ip = ipRegex.test(requestIp.getClientIp(request))
        ? request.connection.remoteAddress.replace("::ffff:", "")
        : request.connection.remoteAddress;

    return new Promise(resolve => {
        ipInfo(ip, null, (err, ipInfo) => {
            if (err) {
                return resolve({ ip });
            }

            resolve(ipInfo);
        });
    });
}

function storeResult(results) {
    return new Promise((resolve, reject) => {
        results.id = uuid.v4();
        fs.writeFile(
            path.join(process.cwd(), basePath, results.id),
            JSON.stringify(results),
            err => {
                if (err) reject(err);
                resolve(results.id);
            }
        );
    });
}

function loadFile(uri) {
    let filename = path.join(process.cwd(), basePath, uri);

    return new Promise((resolve, reject) => {
        fs.exists(filename, exists => {
            if (!exists || uri === "/") {
                filename = path.join(process.cwd(), basePath, "index.html");
            }

            fs.readFile(filename, "binary", (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }

                let contentType = "text/plain";
                switch (path.extname(filename)) {
                    case ".css":
                        contentType = "text/css";
                        break;
                    case ".eot":
                        contentType = "font/eot";
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
                    case ".ttf":
                        contentType = "font/ttf";
                        break;
                    case ".woff":
                        contentType = "font/woff";
                        break;
                    case ".woff2":
                        contentType = "font/woff2";
                        break;
                }

                resolve({
                    contentType,
                    data
                });
            });
        });
    });
}

const httpServer = http
    .createServer((request, response) => {
        const { pathname: uri, query: query } = url.parse(request.url, true);

        try {
            switch (uri) {
                case "/ip":
                    getIP(request).then(ipInfo => {
                        ipInfo = JSON.stringify(ipInfo);
                        response.writeHead(200, {
                            "Content-Type": "application/json",
                            "Content-Length": ipInfo.length
                        });
                        response.write(ipInfo);
                        response.end();
                    });
                    break;
                case "/ping":
                case "/upload":
                    response.writeHead(200);
                    response.end();
                    break;
                case "/download":
                    const params = {
                        size: 8 * 1024 * 1024,
                        chunkSize: 64 * 1024,
                        ...query
                    };
                    response.writeHead(200, {
                        "Content-Type": "application/octet-stream",
                        "Content-Length": params.size
                    });
                    for (let chunk of getData(params)) {
                        response.write(chunk, "binary");
                    }
                    response.end();
                    break;
                case "/save":
                    if (request.method !== 'POST') {
                        response.writeHead(204);
                        response.write('');
                        response.end();
                        return;
                    }
                    let data = [];
                    request.on("data", chunk => data.push(chunk));
                    request.on("end", () => {
                        storeResult(JSON.parse(Buffer.concat(data).toString()))
                            .then(id => {
                                response.writeHead(200, {
                                    "Content-Type": "text/plain",
                                    "Content-Length": id.length
                                });
                                response.write(id);
                                response.end();
                            })
                            .catch(reason => {
                                response.writeHead(500, {
                                    "Content-Type": "text/plain"
                                });
                                response.write(reason.name);
                                response.end();
                            });
                    });
                    break;
                case "/load":
                    const file = path.join(process.cwd(), basePath, query.id);

                    fs.readFile(
                        file,
                        (err, data) => {
                            if (err) {
                                response.writeHead(404);
                                response.write('');
                                response.end();
                                return;
                            }
                            response.writeHead(200, {
                                "Content-Type": "application/json",
                                "Content-Length": data.byteLength
                            });
                            response.write(data.toString());
                            response.end();
                        }
                    );
                    break;
                default:
                    loadFile(uri)
                        .then(file => {
                            response.writeHead(200, {
                                "Content-Type": file.contentType,
                                "Content-Length": file.data.length
                            });
                            response.write(file.data, "binary");
                            response.end();
                        })
                        .catch(reason => {
                            response.writeHead(500, {
                                "Content-Type": "text/plain"
                            });
                            response.write(reason.name);
                            response.end();
                        });
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
