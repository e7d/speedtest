const fs = require("fs");
const gzip = require("./gzip");
const http = require("http");
const ipInfo = require("./ipInfo");
const path = require("path");
const requestIp = require("request-ip");
const url = require("url");

const Logger = require("./logger");
const WebSocketServer = require("./wsServer");
const DownloadData = require("./downloadData");
const ResultWritter = require("./resultWritter");

class HttpServer {
  constructor(port, webPath) {
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

    this.httpServer = http
      .createServer((request, response) => {
        this.logger.debug(`Received request for ${request.url}`);
        const { pathname: uri, query: query } = url.parse(request.url, true);

        if (uri === "/ip") {
          return this.writeIpInfo(request, response);
        }

        if (uri === "/ping" || uri === "/upload") {
          return this.writeEmpty(response);
        }

        if (uri === "/download") {
          return this.writeDownloadData(query, response);
        }

        if (uri === "/save" && request.method === "POST") {
          return this.saveResult(request, response);
        }

        if (uri.startsWith("/results/")) {
          return this.getResults(uri, response);
        }

        this.loadFile(uri, request, response);
      })
      .listen(port);

    if (!this.httpServer.listening) {
      throw new Error(`Server failed listening on port ${port}`);
    }
    this.logger.log(`HTTP server listening at http://0.0.0.0:${port}/`);

    this.wsServer = new WebSocketServer(this.httpServer);
    this.logger.log(`WebSocket server listening at ws://0.0.0.0:${port}/`);

    return this.httpServer;
  }

  writeIpInfo(request, response) {
    const ipRegex = /\:\:ffff\:((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/;
    const ip = ipRegex.test(requestIp.getClientIp(request))
      ? request.connection.remoteAddress.replace("::ffff:", "")
      : request.connection.remoteAddress;

    let info;
    ipInfo(ip)
      .then(response => (info = response))
      .catch(() => (info = { ip }))
      .finally(() => {
        info = Buffer.from(JSON.stringify(info));
        response.writeHead(200, {
          "Content-Type": "application/json",
          "Content-Length": info.byteLength
        });
        response.write(info);
        response.end();
      });
  }

  writeEmpty(response) {
    response.writeHead(200);
    response.end();
  }

  writeDownloadData(query, response) {
    const size = query.size || 8 * 1024 ** 2;
    response.writeHead(200, {
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
        .catch(reason => {
          response.writeHead(500, {
            "Content-Type": "text/plain"
          });
          response.write(reason.name);
          response.end();
        });
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
   *
   * @param {string} uri
   * @param {Request} request
   * @param {Response} response
   */
  loadFile(uri, request, response) {
    if (uri === "/") uri = "index.html";
    let filePath = path.join(this.webFolderPath, uri);
    fs.exists(filePath, exists => {
      if (!exists) {
        response.writeHead(404);
        response.write("Not found");
        response.end();
        return;
      }

      gzip(request, response);
      try {
        const stat = fs.statSync(filePath);
        const buffer = fs.readFileSync(filePath);
        response.writeHead(200, {
          "Content-Type": this.guessContentType(filePath),
          "Content-Length": buffer.length,
          "Last-Modified": stat.mtime.toUTCString()
        });
        response.write(buffer, "binary");
        response.end();
      } catch (reason) {
        response.writeHead(500, {
          "Content-Type": "text/plain"
        });
        response.write(reason.name);
        response.end();
      }
    });
  }
}

module.exports = HttpServer;
