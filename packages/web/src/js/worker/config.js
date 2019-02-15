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
      endpoint: {
        websocket: {
          protocol: self.location.protocol.replace("http", "ws").replace(":", ""),
          host: `${self.location.host}`
        },
        xhr: {
          protocol: self.location.protocol.replace(":", ""),
          host: `${self.location.host}`
        }
      },
      overheadCompensation: this.OVERHEAD["TCP+IPv4+ETH"],
      ip: {
        path: "ip"
      },
      latency: {
        mode: "websocket", // "websocket" or "xhr"
        websocket: {
          path: "ping"
        },
        xhr: {
          path: "ping"
        },
        count: null,
        delay: 0,
        duration: 5,
        gracetime: 1
      },
      download: {
        mode: "xhr", // "websocket" or "xhr"
        websocket: {
          path: "download",
          streams: 1,
          size: 8 * 1024 * 1024,
          binaryType: "blob" // "arraybuffer" or "blob"
        },
        xhr: {
          path: "download",
          streams: 6,
          delay: 150,
          size: 20 * 1024 * 1024,
          responseType: "arraybuffer" // "arraybuffer" or "blob"
        },
        delay: 2,
        duration: 10,
        gracetime: 2
      },
      upload: {
        mode: "xhr", // "websocket" or "xhr"
        websocket: {
          path: "upload",
          streams: 20,
          size: 1 * 1024 * 1024
        },
        xhr: {
          path: "upload",
          streams: 6,
          delay: 150,
          size: 1 * 1024 * 1024
        },
        delay: 2,
        duration: 10,
        gracetime: 2
      },
      result: {
        xhr: {
          path: "save"
        }
      }
    };
  }

  load() {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open("GET", "/config.json", true);
      xhr.onload = () => {
        const config = this.extend(this.defaultConfig, JSON.parse(xhr.response));
        config.endpoint.xhr.uri = `${config.endpoint.xhr.protocol}://${config.endpoint.xhr.host}`;
        config.endpoint.websocket.uri = `${config.endpoint.websocket.protocol}://${config.endpoint.websocket.host}`;
        resolve(config);
      };
      xhr.onerror = () => reject("Could not load configuration file (config.json)");
      xhr.send();
    });
  }

  extend(...objects) {
    const extended = {};
    let i = 0;

    const merge = object => {
      for (const property in object) {
        if (!object.hasOwnProperty(property)) {
          continue;
        }

        if (Object.prototype.isPrototypeOf(object[property])) {
          extended[property] = this.extend(extended[property], object[property]);
          continue;
        }

        extended[property] = object[property];
      }
    };

    for (; i < objects.length; i++) {
      merge(objects[i]);
    }

    return extended;
  }
}
