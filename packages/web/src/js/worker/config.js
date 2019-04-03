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
      "TCP+IPv4+ETH": 1500 / (1500 - 20 - 20 - 14),
      "TCP+IPv6+ETH": 1500 / (1500 - 40 - 20 - 14)
    };
  }

  get defaultConfig() {
    return {
      ignoreErrors: true,
      optimize: false,
      endpoint: this.endpointDefaultConfig,
      overheadCompensation: this.OVERHEAD["TCP+IPv4+ETH"],
      ip: this.ipDefaultConfig,
      latency: this.latencyDefaultConfig,
      download: this.downloadDefaultConfig,
      upload: this.uploadDefaultConfig,
      result: this.resultDefaultConfig
    };
  }

  get endpointDefaultConfig() {
    return {
      websocket: {
        protocol: self.location.protocol.replace("http", "ws").replace(":", ""),
        host: `${self.location.host}`
      },
      xhr: {
        protocol: self.location.protocol.replace(":", ""),
        host: `${self.location.host}`
      }
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
      duration: 5,
      gracetime: 1
    };
  }

  get downloadDefaultConfig() {
    return {
      path: "download",
      streams: 6,
      delay: 150,
      size: 8 * 1024 ** 2,
      minSize: 1 * 1024 ** 2,
      maxSize: 100 * 1024 ** 2,
      responseType: "arraybuffer", // "arraybuffer" or "blob"
      delay: 2,
      duration: 10,
      gracetime: 2
    };
  }

  get uploadDefaultConfig() {
    return {
      path: "upload",
      streams: 6,
      delay: 150,
      size: 1 * 1024 ** 2,
      minSize: 256 * 1024,
      maxSize: 8 * 1024 ** 2,
      delay: 2,
      duration: 10,
      gracetime: 2
    };
  }

  get resultDefaultConfig() {
    return {
      path: "save"
    };
  }

  load() {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open("GET", "/config.json", true);
      xhr.addEventListener("load", () => {
        const config = deepMerge(this.defaultConfig, JSON.parse(xhr.response));
        config.endpoint.xhr.uri = this.getHostname(config, "xhr");
        config.endpoint.websocket.uri = this.getHostname(config, "websocket");
        resolve(config);
      });
      xhr.addEventListener("error", () => reject("Could not load configuration file (config.json)"));
      xhr.send();
    });
  }

  getHostname(config, type) {
    return `${config.endpoint[type].protocol}://${config.endpoint[type].host}`;
  }
}
