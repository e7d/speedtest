import { deepMerge } from "../utils/object";

export default class Config {
  constructor() {
    if (!Config.instance) {
      Config.instance = this;
    }
    return Config.instance;
  }

  get OVERHEAD() {
    return {
      "TCP+IPv4+ETH": 1500 / (1500 - (20 + 20 + 14)),
      "TCP+IPv6+ETH": 1500 / (1500 - (20 + 40 + 14))
    };
  }

  get defaultConfig() {
    return {
      ignoreErrors: true,
      optimize: false,
      endpoint: this.endpointDefaultConfig,
      overheadCompensation: this.OVERHEAD["TCP+IPv4+ETH"],
      connections: "multi",
      ip: this.ipDefaultConfig,
      latency: this.latencyDefaultConfig,
      download: this.downloadDefaultConfig,
      upload: this.uploadDefaultConfig,
      result: this.resultDefaultConfig
    };
  }

  get endpointDefaultConfig() {
    return {
      host: self.location.host,
      isSecure: self.location.protocol === "https:"
    };
  }

  get ipDefaultConfig() {
    return {
      path: "ip"
    };
  }

  get latencyDefaultConfig() {
    return {
      path: "ping",
      count: null,
      delay: 0,
      duration: 5000,
      gracetime: 1000
    };
  }

  get downloadDefaultConfig() {
    return {
      path: "download",
      streams: 6,
      delay: 200,
      duration: 10000,
      gracetime: 2000,
      size: 8 * 1024 ** 2,
      adjustSize: true,
      minSize: 1 * 1024 ** 2,
      maxSize: 100 * 1024 ** 2,
      minDuration: 1000,
      maxDuration: 5000,
      responseType: "arraybuffer" // "arraybuffer" or "blob"
    };
  }

  get uploadDefaultConfig() {
    return {
      path: "upload",
      streams: 6,
      delay: 200,
      duration: 10000,
      gracetime: 2000,
      size: 20 * 1024 ** 2,
      adjustSize: true,
      minSize: 256 * 1024,
      maxSize: 20 * 1024 ** 2,
      minDuration: 1000,
      maxDuration: 5000
    };
  }

  get resultDefaultConfig() {
    return {
      path: "/save"
    };
  }

  load() {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open("GET", "/config.json", true);
      xhr.addEventListener("load", () => {
        const config = deepMerge(this.defaultConfig, JSON.parse(xhr.response));
        resolve(config);
      });
      xhr.addEventListener("error", () => reject("Could not load configuration file (config.json)"));
      xhr.send();
    });
  }

  static getEndpointUri(endpoint, type) {
    return `${type === "websocket" ? "ws" : "http"}${endpoint.isSecure ? "s" : ""}://${endpoint.host}`;
  }
}
