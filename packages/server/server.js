const fs = require("fs");
const path = require("path");

const Logger = require("./src/logger");
const HttpServer = require("./src/httpServer");

const basePath = process.env.BASE_PATH || "web";
const httpPort = process.env.HTTP_PORT || 80;
const httpsPort = process.env.HTTPS_PORT || 443;
const key = process.env.KEY || "certificates/localhost.key";
const cert = process.env.CERT || "certificates/localhost.pem";
const ca = process.env.CA || undefined;
const logger = new Logger();

if (!fs.existsSync(path.join(process.cwd(), "results"))) {
  fs.mkdirSync(path.join(process.cwd(), "results"));
}

process.on("SIGINT", function() {
  process.exit();
});

new HttpServer(basePath, httpPort, httpsPort, key, cert, ca);
