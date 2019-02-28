const LogLevel = require("./logLevel");

class Logger {
  constructor() {
    if (!Logger.instance) {
      Logger.instance = this;

      this.env = process.env.NODE_ENV || "production";
      this.level =
        process.env.LOG_LEVEL ||
        (this.env === "development" ? LogLevel.DEBUG : LogLevel.INFO);
    }

    return Logger.instance;
  }

  debug(message) {
    if (LogLevel.DEBUG < this.level) return;
    console.log(message);
  }
  log(message) {
    if (LogLevel.INFO < this.level) return;
    console.log(message);
  }
  warn(message) {
    if (LogLevel.WARN < this.level) return;
    console.warn(message);
  }
  error(message) {
    if (LogLevel.ERROR < this.level) return;
    console.error(message);
  }
}
module.exports = Logger;
