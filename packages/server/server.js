const fs = require("fs");
const path = require("path");

const Logger = require("./src/logger");
const HttpServer = require("./src/httpServer");

const port = process.argv[2] || 80;
const basePath = process.argv[3] || "web";
const logger = new Logger();

if (!fs.existsSync(path.join(process.cwd(), "results"))) {
  fs.mkdirSync(path.join(process.cwd(), "results"));
}

process.on("SIGINT", function() {
  process.exit();
});

new HttpServer(port, basePath);
