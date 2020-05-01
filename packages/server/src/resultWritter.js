const fs = require("fs");
const gm = require("gm").subClass({ imageMagick: true });
const path = require("path");
const uuid = require("uuid");

class Result {
  constructor(serverFolderPath) {
    this.serverFolderPath = serverFolderPath;
  }

  getDateString(d) {
    return `${d.getUTCFullYear()}/${(d.getUTCMonth() + 1)
      .toString()
      .padStart(2, "0")}/${d
      .getUTCDate()
      .toString()
      .padStart(2, "0")}`;
  }

  getTimeString(d) {
    return `${d
      .getUTCHours()
      .toString()
      .padStart(2, "0")}:${d
      .getUTCMinutes()
      .toString()
      .padStart(2, "0")} UTC`;
  }

  store(result) {
    return new Promise((resolve, reject) => {
      result.id = uuid.v4();
      this.writeJson(result)
        .then(() => this.generateSvgString(result))
        .then(svgString => this.writeSvg(result.id, svgString))
        .then(() => this.convertToPng(result.id))
        .then(() => resolve(result.id))
        .catch(err => reject(err));
    });
  }

  writeJson(result) {
    return new Promise((resolve, reject) => {
      fs.writeFile(
        path.join(this.serverFolderPath, "results", `${result.id}.json`),
        JSON.stringify(result),
        err => {
          if (err) reject(err);
          resolve();
        }
      );
    });
  }

  generateSvgString(result) {
    return new Promise((resolve, reject) => {
      fs.readFile(
        path.join(this.serverFolderPath, "assets", `result.svg`),
        (err, svgBuffer) => {
          if (err) reject(err);

          let svgString = svgBuffer.toString();
          Object.entries({
            "{{date}}": this.getDateString(new Date(result.timestamp)),
            "{{time}}": this.getTimeString(new Date(result.timestamp)),
            "{{latency}}": result.latency.avg,
            "{{jitter}}": result.jitter,
            "{{download}}": (result.download.speed / 1024 / 1024).toFixed(2),
            "{{upload}}": (result.upload.speed / 1024 / 1024).toFixed(2),
            "{{org}}": result.ipInfo.org || result.ipInfo.ip
          }).forEach(([placeholder, value]) => {
            svgString = svgString.replace(placeholder, value || "");
          });
          resolve(svgString);
        }
      );
    });
  }

  writeSvg(resultId, svgString) {
    return fs.writeFileSync(
      path.join(this.serverFolderPath, "results", `${resultId}.svg`),
      svgString
    );
  }

  convertToPng(resultId) {
    return new Promise((resolve, reject) => {
      return gm(
        path.join(this.serverFolderPath, "results", `${resultId}.svg`)
      ).write(
        path.join(this.serverFolderPath, "results", `${resultId}.png`),
        err => {
          if (err) {
            reject(err.message);
            return;
          }
          resolve(resultId);
        }
      );
    });
  }
}
module.exports = Result;
