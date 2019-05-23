const fs = require("fs");
const path = require("path");

const Logger = require("./src/logger");
const HttpServer = require("./src/httpServer");

const basePath = process.argv[2] || "web";
const httpPort = process.argv[3] || 80;
const httpsPort = process.argv[4] || 443;
const logger = new Logger();

if (!fs.existsSync(path.join(process.cwd(), "results"))) {
  fs.mkdirSync(path.join(process.cwd(), "results"));
}

process.on("SIGINT", function() {
  process.exit();
});

new HttpServer(basePath, httpPort, httpsPort);
