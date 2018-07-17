//@ts-check

class Config {
    static get defaultConfig() {
        return {
            ignoreErrors: true,
            optimize: false,
            mode: "xhr", // 'websocket' or 'xhr'
            websocket: {
                protocol: null, // 'ws' or 'wss'
                host: null // "localhost:8080"
            },
            overheadCompensation: Config.OVERHEAD["TCP+IPv4+ETH"],
            ip: {
                endpoint: "ip"
            },
            latency: {
                websocket: {
                    path: "/ping"
                },
                xhr: {
                    endpoint: "ping"
                },
                count: null,
                delay: 0,
                duration: 5,
                gracetime: 1
            },
            download: {
                websocket: {
                    path: "/download",
                    streams: 20,
                    size: 1 * 1024 * 1024
                },
                xhr: {
                    endpoint: "download",
                    streams: 3,
                    delay: 300,
                    size: 20 * 1024 * 1024,
                    responseType: "arraybuffer" // "arraybuffer" or "blob"
                },
                delay: 2,
                duration: 10,
                gracetime: 2
            },
            upload: {
                websocket: {
                    path: "/upload",
                    streams: 20,
                    size: 1 * 1024 * 1024
                },
                xhr: {
                    endpoint: "upload",
                    streams: 3,
                    delay: 300,
                    size: 20 * 1024 * 1024
                },
                delay: 2,
                duration: 10,
                gracetime: 2
            }
        };
    }

    static get OVERHEAD() {
        return {
            "TCP+IPv4+ETH": 1500 / (1500 - 20 - 20 - 14),
            "TCP+IPv6+ETH": 1500 / (1500 - 40 - 20 - 14)
        };
    }
}

export default Config;
