//@ts-check

class Config {
    static get OVERHEAD() {
        return {
            "TCP+IPv4+ETH": 1500 / (1500 - 20 - 20 - 14),
            "TCP+IPv6+ETH": 1500 / (1500 - 40 - 20 - 14)
        };
    }

    static get defaultConfig() {
        return {
            ignoreErrors: true,
            optimize: false,
            mode: "xhr", // "websocket" or "xhr"
            websocket: {
                protocol: null, // null, "ws" or "wss"
                host: null // null or value (ie: "example.com:8080")
            },
            xhr: {
                protocol: null, // null, "http" or "https"
                host: null // null or value (ie: "example.com:8080")
            },
            overheadCompensation: Config.OVERHEAD["TCP+IPv4+ETH"],
            ip: {
                path: "ip"
            },
            latency: {
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
                websocket: {
                    path: "download",
                    streams: 20,
                    size: 8 * 1024 * 1024,
                    binaryType: "blob" // "arraybuffer" or "blob"
                },
                xhr: {
                    path: "download",
                    streams: 6,
                    delay: 150,
                    size: 8 * 1024 * 1024,
                    responseType: "arraybuffer" // "arraybuffer" or "blob"
                },
                delay: 2,
                duration: 10,
                gracetime: 2
            },
            upload: {
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
            }
        };
    }

    static loadConfig() {
        return new Promise((resolve, reject) => {
            const endpoint = "/config.json";
            const xhr = new XMLHttpRequest();

            xhr.open("GET", endpoint, true);
            xhr.onload = () => resolve(this.extend(this.defaultConfig, JSON.parse(xhr.response)));
            xhr.onerror = e => reject(e.message);
            xhr.send();
        });
    }

    static extend(...objects) {
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

export default Config;
