const fs = require("fs");
const gm = require("gm").subClass({ imageMagick: true });
const http = require("http");
const ipInfo = require("ipinfo");
const path = require("path");
const requestIp = require("request-ip");
const url = require("url");
const uuid = require("uuid");
const WebSocketServer = require("websocket").server;

const port = process.argv[2] || 80;
const basePath = process.argv[3] || "web";
const DEBUG = process.argv[4] || false;

if (!fs.existsSync(path.join(__dirname, "results"))) {
  fs.mkdirSync(path.join(__dirname, "results"));
}

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

function consoleLog(message, force) {
  (DEBUG || force) && console.log(`[${new Date().toJSON()}]: ${message}`);
}

function getDateString(d) {
  return `${d.getUTCFullYear()}/${(d.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}/${d
    .getUTCDate()
    .toString()
    .padStart(2, "0")}`;
}

function getTimeString(d) {
  return `${d
    .getUTCHours()
    .toString()
    .padStart(2, "0")}:${d
    .getUTCMinutes()
    .toString()
    .padStart(2, "0")} UTC`;
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

function storeResult(result) {
  return new Promise((resolve, reject) => {
    result.id = uuid.v4();
    fs.writeFile(
      path.join(__dirname, "results", `${result.id}.json`),
      JSON.stringify(result),
      err => {
        if (err) reject(err);

        fs.readFile(
          path.join(__dirname, "assets", `result.svg`),
          (err, svgBuffer) => {
            if (err) reject(err);

            let svgString = svgBuffer.toString();
            Object.entries({
              "{{date}}": getDateString(new Date(result.timestamp)),
              "{{time}}": getTimeString(new Date(result.timestamp)),
              "{{latency}}": result.latency.avg,
              "{{jitter}}": result.jitter,
              "{{download}}": (result.download.speed / 1024 / 1024).toFixed(2),
              "{{upload}}": (result.upload.speed / 1024 / 1024).toFixed(2),
              "{{org}}": result.ipInfo.org || result.ipInfo.ip
            }).forEach(([placeholder, value]) => {
              svgString = svgString.replace(placeholder, value || "");
            });
            fs.writeFileSync(
              path.join(__dirname, "results", `${result.id}.svg`),
              svgString
            );

            gm(path.join(__dirname, "results", `${result.id}.svg`)).write(
              path.join(__dirname, "results", `${result.id}.png`),
              err => {
                if (err) reject(err.message);
                resolve(result.id);
              }
            );
          }
        );
      }
    );
  });
}

function guessResultFile(uri) {
  const filename = uri.split("/").pop();
  const extension = filename.split(".").pop();
  const filePath = path.join(__dirname, "results", filename);

  return [
    filePath,
    {
      svg: "image/svg+xml",
      png: "image/png",
      json: "application/json"
    }[extension]
  ];
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
    consoleLog(`Received request for ${request.url}`);
    const { pathname: uri, query: query } = url.parse(request.url, true);

    if (uri === "/ip") {
      getIP(request).then(ipInfo => {
        ipInfo = JSON.stringify(ipInfo);
        response.writeHead(200, {
          "Content-Type": "application/json",
          "Content-Length": ipInfo.length
        });
        response.write(ipInfo);
        response.end();
      });
      return;
    }

    if (uri === "/ping" || uri === "/upload") {
      response.writeHead(200);
      response.end();
      return;
    }

    if (uri === "/download") {
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
      return;
    }

    if (uri === "/save" && request.method === "POST") {
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
      return;
    }

    if (uri.startsWith("/results/")) {
      const [filePath, contentType] = guessResultFile(uri);

      fs.readFile(filePath, (err, fileData) => {
        if (err) {
          response.writeHead(404);
          response.write("");
          response.end();
          return;
        }
        response.writeHead(200, {
          "Content-Type": contentType,
          "Content-Length": fileData.byteLength
        });
        response.write(fileData);
        response.end();
      });
      return;
    }

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
  })
  .listen(port);

if (!httpServer.listening) {
  throw new Error(`Server failed listening on port ${port}`);
}
consoleLog(`Server listening at http://0.0.0.0:${port}/`, true);

const wsServer = new WebSocketServer({
  httpServer,
  maxReceivedFrameSize: 20 * 1024 * 1024
});

function originIsAllowed(origin) {
  // ToDo: filter depending of origin
  return true;
}

wsServer.on("request", request => {
  if (!originIsAllowed(request.origin)) {
    request.reject();
    consoleLog(`Connection from origin ${request.origin} rejected.`, true);
    return;
  }
  consoleLog(`Connection from origin ${request.origin} accepted.`, true);

  let downloadData = "";
  const connection = request.accept(null, request.origin);
  consoleLog(`Peer ${connection.remoteAddress} connected.`, true);

  // handle messages
  connection.on("message", message => {
    if (message.type === "utf8") {
      consoleLog(`Received Message: ${message.utf8Data}`);
      let data;
      try {
        data = JSON.parse(message.utf8Data);
      } catch (e) {
        connection.sendUTF("unknown");
        return;
      }

      switch (data.action) {
        case "ping":
          connection.sendUTF(
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
          connection.sendUTF(downloadData);
          break;
      }
    }

    if (message.type === "binary") {
      consoleLog(`Received Binary Message of ${message.binaryData.length} bytes`);
      connection.sendBytes(message.binaryData);
      return;
    }
  });

  connection.on("close", (reasonCode, description) => {
    consoleLog(`Peer ${connection.remoteAddress} disconnected.`, true);
    downloadData = null;
  });
});
