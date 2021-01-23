const fs = require("fs");
const gzip = require("./gzip");
const http = require("http");
const https = require("https");
const ipInfo = require("./ipInfo");
const path = require("path");
const requestIp = require("request-ip");
const url = require("url");

const Logger = require("./logger");
const WebSocketServer = require("./wsServer");
const DownloadData = require("./downloadData");
const ResultWritter = require("./resultWritter");

const pagesUriList = [
  "/about",
  new RegExp("/result/.+"),
  "/results",
  "/run",
  new RegExp("/share/.+"),
  "/settings"
];

class HttpServer {
  constructor(webPath, httpPort, httpsPort, key, cert, ca) {
    this.serverFolderPath = process.cwd();
    this.webFolderPath = path.isAbsolute(webPath)
      ? webPath
      : path.join(this.serverFolderPath, webPath);
    this.logger = new Logger();
    this.downloadData = new DownloadData();
    this.resultWritter = new ResultWritter(this.serverFolderPath);

    if (!fs.existsSync(this.webFolderPath)) {
      this.logger.error(
        `The web folder does not exists: ${this.webFolderPath}`
      );
      return;
    }

    this.httpServer = this.createHttpServer(httpPort);
    if (!this.httpServer.listening) {
      throw new Error(`Server failed listening on port ${httpPort}`);
    }
    this.logger.log(`HTTP server listening at http://0.0.0.0:${httpPort}/`);

    this.wsServer = new WebSocketServer(this.httpServer);
    this.logger.log(`WebSocket server listening at ws://0.0.0.0:${httpPort}/`);

    const httpsOptions = {
      key: fs.readFileSync(key),
      cert: fs.readFileSync(cert)
    };
    if (ca) httpsOptions.ca = [fs.readFileSync(ca)];
    this.httpsServer = this.createHttpsServer(httpsPort, httpsOptions);
    if (!this.httpServer.listening) {
      throw new Error(`Server failed listening on port ${httpsPort}`);
    }
    this.logger.log(`HTTPS server listening at https://0.0.0.0:${httpsPort}/`);

    this.wssServer = new WebSocketServer(this.httpsServer);
    this.logger.log(
      `WebSocket server listening at wss://0.0.0.0:${httpsPort}/`
    );
  }

  createHttpServer(port) {
    return http
      .createServer((request, response) =>
        this.listenRequest(request, response)
      )
      .listen(port);
  }

  createHttpsServer(port, options) {
    return https
      .createServer(options, (request, response) =>
        this.listenRequest(request, response)
      )
      .listen(port);
  }

  getIp(request) {
    const ipRegex = /\:\:ffff\:((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/;
    const ip =
      requestIp.getClientIp(request) || request.connection.remoteAddress;
    return ipRegex.test(ip) ? ip.replace("::ffff:", "") : ip;
  }

  writeIpInfo(request, response) {
    const ip = this.getIp(request);
    let info;
    ipInfo(ip)
      .then(response => (info = response))
      .catch(() => (info = { ip }))
      .finally(() => {
        info = Buffer.from(JSON.stringify(info));
        response.writeHead(200, {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
          "Content-Length": info.byteLength
        });
        response.write(info);
        response.end();
      });
  }

  listenRequest(request, response) {
    this.logger.debug(`Received request for ${request.url}`);
    const { pathname: uri, query } = url.parse(request.url, true);

    if (uri === "/ip") return this.writeIpInfo(request, response);
    if (uri === "/ping" || uri === "/upload") return this.writeEmpty(response);
    if (uri === "/download") return this.writeDownloadData(query, response);
    if (uri === "/save" && request.method === "POST")
      return this.saveResult(request, response);
    if (uri.startsWith("/results/")) return this.getResults(uri, response);

    this.loadFile(uri, request, response);
  }

  writeEmpty(response) {
    response.writeHead(200, {
      "Access-Control-Allow-Headers": "Content-Type, Content-Encoding",
      "Access-Control-Allow-Origin": "*"
    });
    response.end();
  }

  writeError(response, reason) {
    response.writeHead(500, {
      "Content-Type": "text/plain"
    });
    response.write(reason);
    response.end();
  }

  writeDownloadData(query, response) {
    const size = query.size || 8 * 1024 ** 2;
    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/octet-stream",
      "Content-Length": size
    });
    for (let chunk of this.downloadData.get(size)) {
      response.write(chunk, "binary");
    }
    response.end();
  }

  saveResult(request, response) {
    let data = [];
    request.on("data", chunk => data.push(chunk));
    request.on("end", () => {
      this.resultWritter
        .store(JSON.parse(Buffer.concat(data).toString()))
        .then(id => {
          response.writeHead(200, {
            "Content-Type": "text/plain",
            "Content-Length": id.length
          });
          response.write(id);
          response.end();
        })
        .catch(reason => this.writeError(response, reason));
    });
  }

  getResults(uri, response) {
    const [filePath, contentType] = this.guessResultFile(uri);
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
  }

  guessResultFile(uri) {
    const filename = uri.split("/").pop();
    const extension = filename.split(".").pop();
    const filePath = path.join(this.serverFolderPath, "results", filename);

    return [
      filePath,
      {
        svg: "image/svg+xml",
        png: "image/png",
        json: "application/json"
      }[extension]
    ];
  }

  guessContentType(filename) {
    switch (path.extname(filename)) {
      case ".css":
        return "text/css";
      case ".eot":
        return "font/eot";
      case ".html":
        return "text/html";
      case ".js":
        return "application/javascript";
      case ".svg":
        return "image/svg+xml";
      case ".ttf":
        return "font/ttf";
      case ".woff":
        return "font/woff";
      case ".woff2":
        return "font/woff2";
      default:
        return "text/plain";
    }
  }

  /**
   * Load a static file
   * @param {string} uri
   * @param {Request} request
   * @param {Response} response
   */
  loadFile(uri, request, response) {
    if (
      uri === "/" ||
      pagesUriList.some(
        pageUri =>
          (pageUri instanceof RegExp && pageUri.test(uri)) ||
          (typeof pageUri === "string" && uri === pageUri)
      )
    ) {
      uri = "index.html";
    }
    let filePath = path.join(this.webFolderPath, uri);
    fs.access(filePath, (err) => {
      if (err && err.code === 'ENOENT') {
        response.writeHead(404);
        response.write("Not found");
        response.end();
        return;
      }

      this.serveFile(filePath, request, response);
    });
  }

  serveFile(filePath, request, response) {
    gzip(request, response);
    try {
      fs.stat(filePath, (err, stats) => {
        if (err) throw err.message;
        fs.readFile(filePath, (err, buffer) => {
          if (err) throw err.message;
          const contentType = this.guessContentType(filePath);
          response.writeHead(200, {
            "Content-Type": contentType,
            "Content-Length": buffer.length,
            "Last-Modified": stats.mtime.toUTCString(),
            Expires: this.getExpiresDate(stats.mtime, contentType).toUTCString()
          });
          response.write(buffer, "binary");
          response.end();
        });
      });
    } catch (reason) {
      this.writeError(response, reason);
    }
  }

  getExpiresDate(modifiedDate, contentType) {
    modifiedDate.setDate(
      modifiedDate.getDate() +
        (["application/javascript", "text/css"].includes(contentType) ? 365 : 7)
    );
    return modifiedDate;
  }
}

module.exports = HttpServer;
