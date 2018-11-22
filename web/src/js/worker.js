import Bandwidth from "./utils/bandwidth";
import Performance from "./utils/performance";
import Request from "./utils/request";
import Uuid from "./utils/uuid";

import Config from "./worker/config";
import STATUS from "./worker/status";
import STEP from "./worker/step";

/**
 * Speed Test worker
 *
 * @class SpeedTestWorker
 */
export default class SpeedTestWorker {
    /**
     * Creates an instance of SpeedTestWorker.
     * @param {DedicatedWorkerGlobalScope} scope
     */
    constructor(scope = self) {
        this.scope = scope;

        this.running = false;
        this.step = null;
        this.error = false;
        this.data = {};
        this.requests = [];
        this.test = {};
        this.results = {};
        this.alerts = {};
        if (this.scope.location.protocol === "https:") {
            this.alerts = {
                https:
                    "Speed test is loaded through HTTPS propocol, results may be impacted."
            };
            console.warn(this.alerts.https);
        }

        Config.loadConfig().then(config => {
            this.config = config;
            this.status = STATUS.READY;
            this.postStatus();

            this.status = STATUS.WAITING;
        });

        this.scope.addEventListener("message", this.processMessage.bind(this));

        return this;
    }

    /**
     * Process incoming event message
     *
     * @param {any} event
     */
    processMessage(event) {
        switch (event.data) {
            case "abort":
                this.abort();
                this.postStatus();
                break;
            case "config":
                this.postMessage(this.config);
                break;
            case "start":
                this.run()
                    .then(() => {
                        this.postStatus();
                    })
                    .catch(reason => {
                        console.error("FAIL", reason);
                    });
                break;
            case "status":
                this.postStatus();
                break;
        }
    }

    /**
     * Post a message
     */
    postMessage(message) {
        this.scope.postMessage(message);
    }

    /**
     * Post a message with the current status
     */
    postStatus() {
        this.postMessage({
            status: this.status,
            config: this.config,
            step: this.step,
            results: this.results,
            alerts: this.alerts
        });
    }

    /**
     * Run the IP test
     *
     * @returns {Promise}
     */
    async testIP() {
        const run = () => {
            return new Promise((resolve, reject) => {
                const endpoint = `${this.config.xhr.endpoint}/${
                    this.config.ip.path
                }?${Uuid.v4()}`;
                const xhr = new XMLHttpRequest();

                xhr.open("GET", endpoint, true);
                xhr.addEventListener("load", () => {
                    this.results.ip = xhr.response;
                    Request.clearXMLHttpRequest(xhr);

                    resolve();
                });
                xhr.addEventListener("error", () => {
                    Request.clearXMLHttpRequest(xhr);

                    reject({
                        status: STATUS.FAILED,
                        error: "test failed"
                    });
                });
                xhr.send();
            });
        };

        this.ip = {
            status: STATUS.STARTING,
            running: true,
            data: []
        };

        return run()
            .catch(reason => {
                this.ip.error = reason;
                this.results.ip = null;
            })
            .then(() => {
                this.ip.running = false;
                this.processMessage({
                    data: "status"
                });
                Request.clearRequests(this.requests);

                if (this.ip.error) {
                    throw this.ip.error;
                }
            });
    }

    /**
     * Run the latency test
     *
     * @returns {Promise}
     */
    async testLatency() {
        const run =
            "websocket" === this.config.latency.mode
                ? (delay = 0) => this.testLatencyWebSocket(delay)
                : (delay = 0) => this.testLatencyXHR(delay);

        this.test.latency = {
            initDate: null,
            status: STATUS.WAITING,
            running: true,
            data: [],
            pingDate: []
        };

        this.processLatencyResults();
        this.test.timeouts.push(
            this.scope.setTimeout(() => {
                this.test.latency.status = STATUS.STARTING;
                this.test.latency.initDate = Date.now();
            }, this.config.latency.delay * 1000)
        );
        this.test.timeouts.push(
            this.scope.setTimeout(() => {
                this.test.latency.status = STATUS.RUNNING;
                this.test.latency.startDate = Date.now();
            }, this.config.latency.delay * 1000 + this.config.latency.gracetime * 1000)
        );
        this.test.timeouts.push(
            this.scope.setTimeout(() => {
                this.test.latency.status = STATUS.DONE;
                this.test.latency.running = false;
            }, this.config.latency.delay * 1000 + this.config.latency.duration * 1000)
        );

        return run(this.config.latency.delay * 1000)
            .then(() => this.processLatencyResults)
            .catch(reason => {
                this.test.latency.error = reason;
                this.results.latency = null;
            })
            .then(() => {
                this.test.latency.running = false;
                Request.clearRequests(this.requests);

                if (this.test.latency.error) {
                    throw this.test.latency.error;
                }
            });
    }

    /**
     * Run the WebSocket based latency test
     *
     * @param {number} [delay=0]
     * @returns {Promise}
     */
    testLatencyWebSocket(delay = 0) {
        let index = 0;

        return new Promise((resolve, reject) => {
            if (STATUS.ABORTED === this.status) {
                return reject({
                    status: STATUS.ABORTED
                });
            }

            if (STATUS.DONE === this.test.latency.status) {
                return resolve();
            }

            const endpoint = `${this.config.websocket.protocol}://${
                this.config.websocket.host
            }/${this.config.latency.websocket.path}`;
            const socket = new WebSocket(endpoint);
            this.requests[index] = socket;

            socket.addEventListener("message", e => {
                if (STATUS.ABORTED === this.status) {
                    socket.close();
                    return reject({ status: STATUS.ABORTED });
                }

                if (STATUS.DONE === this.test.latency.status) {
                    socket.close();
                    return resolve();
                }

                if (STATUS.RUNNING === this.test.latency.status) {
                    const data = JSON.parse(e.data);
                    const index = data.index;
                    let networkLatency =
                        Date.now() - this.test.latency.pingDate[index];
                    networkLatency = +networkLatency.toFixed(2);
                    this.test.latency.data.push(networkLatency);
                }

                this.processLatencyResults();

                index += 1;
                this.test.latency.pingDate[index] = Date.now();
                socket.send(
                    JSON.stringify({
                        action: "ping",
                        index: index
                    })
                );
            });

            socket.addEventListener("close", () => {
                Request.clearWebSocket(socket);
            });

            socket.addEventListener("error", () => {
                if (this.config.ignoreErrors) {
                    this.testLatencyWebSocket()
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                Request.clearWebSocket(socket);

                reject({
                    status: STATUS.FAILED,
                    error: "test failed"
                });
            });

            socket.addEventListener("open", () => {
                this.scope.setTimeout(() => {
                    index += 1;
                    this.test.latency.pingDate[index] = +new Date();
                    socket.send(
                        JSON.stringify({
                            action: "ping",
                            index: index
                        })
                    );
                }, delay);
            });
        });
    }

    /**
     * Run the XHR based latency test
     *
     * @param {number} [delay=0]
     * @returns {Promise}
     */
    testLatencyXHR(delay = 0) {
        let pingDate, pongDate;
        const index = this.test.latency.index++;

        return new Promise((resolve, reject) => {
            if (STATUS.ABORTED === this.status) {
                return reject({
                    status: STATUS.ABORTED
                });
            }

            if (STATUS.DONE === this.test.latency.status) {
                return resolve();
            }

            const endpoint = `${this.config.xhr.endpoint}/${
                this.config.latency.xhr.path
            }?${Uuid.v4()}`;
            const xhr = new XMLHttpRequest();
            this.requests[index] = xhr;

            xhr.open("GET", endpoint, true);
            xhr.addEventListener("loadstart", () => {
                pingDate = Date.now();
            });
            xhr.addEventListener("readystatechange", e => {
                if (!pongDate && xhr.readyState >= 2) pongDate = Date.now();
            });
            xhr.addEventListener("load", () => {
                if (STATUS.ABORTED === this.status) {
                    return reject({ status: STATUS.ABORTED });
                }

                if (STATUS.DONE === this.test.latency.status) {
                    return resolve();
                }

                if (STATUS.RUNNING === this.test.latency.status) {
                    const performance = Performance.getEntry(
                        this.scope,
                        endpoint
                    );
                    let networkLatency =
                        null !== performance
                            ? performance.responseStart -
                                  performance.requestStart ||
                              performance.duration
                            : pongDate - pingDate;

                    networkLatency = +networkLatency.toFixed(2);
                    this.test.latency.data.push(networkLatency);
                }

                this.processLatencyResults();
                if (
                    this.config.latency.count &&
                    index >= this.config.latency.count
                ) {
                    return resolve();
                }

                this.testLatencyXHR()
                    .then(resolve)
                    .catch(reject);
            });
            xhr.addEventListener("error", () => {
                if (this.config.ignoreErrors) {
                    this.testLatencyXHR()
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                reject({
                    status: STATUS.FAILED,
                    error: "test failed"
                });
            });

            this.test.timeouts.push(
                this.scope.setTimeout(() => {
                    xhr.send();
                    pingDate = Date.now();
                }, delay)
            );
        });
    }

    /**
     * Process the latency test results
     *
     * @returns {Promise}
     */
    processLatencyResults() {
        this.results.latency = {
            status: this.test.latency.status,
            progress: 0
        };
        if (this.test.latency.status <= STATUS.WAITING) {
            return;
        }

        const durationFromInit =
            (Date.now() - this.test.latency.initDate) / 1000;
        const progress = durationFromInit / this.config.latency.duration;
        Object.assign(this.results.latency, {
            progress: progress
        });
        if (this.test.latency.status <= STATUS.STARTING) {
            return;
        }

        const latencies = this.test.latency.data;
        Object.assign(this.results.latency, {
            min: +Math.min.apply(null, latencies).toFixed(2),
            max: +Math.max.apply(null, latencies).toFixed(2),
            avg: +(
                latencies.reduce((a, b) => a + b, 0) / latencies.length
            ).toFixed(2),
            jitter: 0
        });

        if (latencies.length < 2) {
            return;
        }

        latencies.forEach((value, index) => {
            if (0 === index) {
                return;
            }

            // RFC 1889 (https://www.ietf.org/rfc/rfc1889.txt):
            // J=J+(|D(i-1,i)|-J)/16
            const deltaPing = Math.abs(latencies[index - 1] - latencies[index]);
            this.results.latency.jitter +=
                (deltaPing - this.results.latency.jitter) / 16.0;
        }, this);
        this.results.latency.jitter = +this.results.latency.jitter.toFixed(2);
    }

    /**
     * Run the download speed test
     *
     * @returns {Promise}
     */
    async testDownloadSpeed() {
        const run =
            "websocket" === this.config.download.mode
                ? (size, delay = 0) =>
                      this.testDownloadSpeedWebSocket(size, delay)
                : (size, delay = 0) => this.testDownloadSpeedXHR(size, delay);

        this.test.download = {
            initDate: null,
            status: STATUS.WAITING,
            running: true,
            startDate: null,
            size: 0,
            index: 0,
            promises: []
        };

        this.test.download.promises = [];
        for (let index = 0; index < this.config.download.xhr.streams; index++) {
            const testPromise = run(
                this.config.download.xhr.size,
                this.config.download.delay * 1000 +
                    index * this.config.download.xhr.delay
            );
            this.test.download.promises.push(testPromise);
        }

        this.processDownloadSpeedResults();
        this.test.timeouts.push(
            this.scope.setTimeout(() => {
                this.test.download.status = STATUS.STARTING;
                this.test.download.initDate = Date.now();
            }, this.config.download.delay * 1000)
        );
        this.test.timeouts.push(
            this.scope.setTimeout(() => {
                this.test.download.status = STATUS.RUNNING;
                this.test.download.startDate = Date.now();
            }, this.config.download.delay * 1000 + this.config.download.gracetime * 1000)
        );
        this.test.timeouts.push(
            this.scope.setTimeout(() => {
                this.test.download.status = STATUS.DONE;
                this.test.download.running = false;
            }, this.config.download.delay * 1000 + this.config.download.duration * 1000)
        );

        return Promise.all(this.test.download.promises)
            .then(() => this.processDownloadSpeedResults)
            .catch(reason => {
                this.test.download.error = reason;
                this.results.latency = null;
            })
            .then(() => {
                this.test.download.running = false;
                Request.clearRequests(this.requests);

                if (this.test.download.error) {
                    throw this.test.download.error;
                }
            });
    }

    /**
     * Run the WebSocket based download speed test
     *
     * @param {any} size
     * @param {number} [delay=0]
     * @returns {Promise}
     */
    testDownloadSpeedWebSocket(size, delay = 0) {
        const index = this.test.download.index++;

        return new Promise((resolve, reject) => {
            if (STATUS.ABORTED === this.status) {
                return reject({
                    status: STATUS.ABORTED
                });
            }

            if (STATUS.DONE === this.test.download.status) {
                return resolve();
            }

            const endpoint = `${this.config.websocket.protocol}://${this
                .config.websocket.host}/${
                this.config.download.websocket.path
            }`;
            const socket = new WebSocket(endpoint);
            socket.binaryType = this.config.download.websocket.binaryType;
            this.requests[index] = socket;
            socket.addEventListener("message", e => {
                if (STATUS.ABORTED === this.status) {
                    socket.close();
                    return reject({ status: STATUS.ABORTED });
                }

                if (STATUS.DONE === this.test.download.status) {
                    socket.close();
                    return resolve();
                }

                if (STATUS.RUNNING === this.test.download.status) {
                    this.test.download.size += e.data.length;
                }
                this.processDownloadSpeedResults();

                socket.send(
                    JSON.stringify({
                        action: "download"
                    })
                );
            });

            socket.addEventListener("close", () => {
                Request.clearWebSocket(socket);
            });

            socket.addEventListener("error", () => {
                if (this.config.ignoreErrors) {
                    this.testDownloadSpeedWebSocket(size)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                Request.clearWebSocket(socket);

                reject({
                    status: STATUS.FAILED,
                    error: "test failed"
                });
            });

            socket.addEventListener("open", () => {
                this.scope.setTimeout(() => {
                    socket.send(
                        JSON.stringify({
                            action: "prepare",
                            size: this.config.download.websocket.size,
                            chunkSize: this.config.download.websocket.chunkSize
                        })
                    );

                    socket.send(
                        JSON.stringify({
                            action: "download"
                        })
                    );
                }, delay);
            });
        });
    }

    /**
     * Run the XHR based download speed test
     *
     * @param {any} size
     * @param {number} [delay=0]
     * @returns {Promise}
     */
    testDownloadSpeedXHR(size, delay = 0) {
        const index = this.test.download.index++;

        return new Promise((resolve, reject) => {
            if (STATUS.ABORTED === this.status) {
                return reject({
                    status: STATUS.ABORTED
                });
            }

            if (STATUS.DONE === this.test.download.status) {
                return resolve();
            }

            const endpoint = `${this.config.xhr.endpoint}/${
                this.config.download.xhr.path
            }?${Uuid.v4()}&size=${size}`;

            const xhr = new XMLHttpRequest();
            this.requests[index] = xhr;
            Object.assign(xhr, {
                responseType: this.config.download.xhr.responseType
            });

            let sizeLoaded = 0;
            xhr.open("GET", endpoint, true);
            xhr.addEventListener("progress", e => {
                if (STATUS.ABORTED === this.status) {
                    Request.clearXMLHttpRequest(xhr);
                    reject({ status: STATUS.ABORTED });
                    return;
                }

                if (STATUS.DONE === this.test.download.status) {
                    Request.clearXMLHttpRequest(xhr);
                    resolve();
                    return;
                }

                const loadDiff = e.loaded - sizeLoaded;
                sizeLoaded = e.loaded;
                if (STATUS.RUNNING === this.test.download.status) {
                    this.test.download.size += loadDiff;
                }
                this.processDownloadSpeedResults();
            });
            xhr.addEventListener("load", () => {
                Request.clearXMLHttpRequest(xhr);

                this.testDownloadSpeedXHR(size)
                    .then(resolve)
                    .catch(reject);
            });
            xhr.addEventListener("error", () => {
                Request.clearXMLHttpRequest(xhr);

                if (this.config.ignoreErrors) {
                    this.testDownloadSpeedXHR(size)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                reject({
                    status: STATUS.FAILED,
                    error: "test failed"
                });
            });

            this.test.timeouts.push(
                this.scope.setTimeout(() => xhr.send(null), delay)
            );
        });
    }

    /**
     * Process the download speed test results
     */
    processDownloadSpeedResults() {
        this.results.download = {
            status: this.test.download.status,
            progress: 0
        };
        if (this.test.download.status <= STATUS.WAITING) {
            return;
        }

        const durationFromInit =
            (Date.now() - this.test.download.initDate) / 1000;
        const durationFromStart =
            (Date.now() - this.test.download.startDate) / 1000;
        const progress = durationFromInit / this.config.download.duration;
        Object.assign(this.results.download, {
            progress: progress
        });
        if (this.test.download.status <= STATUS.STARTING) {
            return;
        }

        const { bitBandwidth: bandwidth } = Bandwidth.compute(
            this.test.download.size,
            durationFromStart,
            this.config.overheadCompensation
        );
        Object.assign(this.results.download, {
            speed: +bandwidth.toFixed(2)
        });
    }

    /**
     * Produce random data
     *
     * @returns {Float32Array}
     */
    getRandomData() {
        const bufferSize = 128 * 1024;
        const buffer = new Float32Array(new ArrayBuffer(bufferSize));
        for (let index = 0; index < buffer.length; index++) {
            buffer[index] = Math.random();
        }

        const dataSize = this.config.upload.xhr.size;
        let data = new Float32Array(new ArrayBuffer(dataSize));
        for (let i = 0; i < data.byteLength / buffer.byteLength; i++) {
            data.set(buffer, i * buffer.length);
        }

        return data;
    }

    /**
     * Produce a Blob made of random data
     *
     * @returns {Blob}
     */
    getRandomBlob() {
        return new Blob([this.getRandomData()], {
            type: "application/octet-stream"
        });
    }

    /**
     * Run the upload speed
     *
     * @returns {Promise}
     */
    async testUploadSpeed() {
        const run =
            "websocket" === this.config.upload.mode
                ? (size, delay = 0) =>
                      this.testUploadSpeedWebSocket(size, delay)
                : (size, delay = 0) => this.testUploadSpeedXHR(size, delay);

        this.test.upload = {
            initDate: null,
            status: STATUS.WAITING,
            running: true,
            startDate: null,
            size: 0,
            index: 0,
            promises: [],
            blob: this.getRandomBlob()
        };

        this.test.upload.promises = [];
        for (let index = 0; index < this.config.upload.xhr.streams; index++) {
            const testPromise = run(
                this.config.upload.xhr.size,
                this.config.upload.delay * 1000 +
                    index * this.config.upload.xhr.delay
            );
            this.test.upload.promises.push(testPromise);
        }

        this.processUploadSpeedResults();
        this.test.timeouts.push(
            this.scope.setTimeout(() => {
                this.test.upload.status = STATUS.STARTING;
                this.test.upload.initDate = Date.now();
            }, this.config.upload.delay * 1000)
        );
        this.test.timeouts.push(
            this.scope.setTimeout(() => {
                this.test.upload.status = STATUS.RUNNING;
                this.test.upload.startDate = Date.now();
            }, this.config.upload.delay * 1000 + this.config.upload.gracetime * 1000)
        );
        this.test.timeouts.push(
            this.scope.setTimeout(() => {
                this.test.upload.status = STATUS.DONE;
                this.test.upload.running = false;
            }, this.config.upload.delay * 1000 + this.config.upload.duration * 1000)
        );

        return Promise.all(this.test.upload.promises)
            .then(() => this.processUploadSpeedResults)
            .catch(reason => {
                this.test.upload.error = reason;
                this.results.latency = null;
            })
            .then(() => {
                this.test.upload.running = false;
                delete this.test.upload.blob;
                Request.clearRequests(this.requests);

                if (this.test.upload.error) {
                    throw this.test.upload.error;
                }
            });
    }

    /**
     * Run the WebSocket based upload speed test
     *
     * @param {any} size
     * @param {number} [delay=0]
     * @returns {Promise}
     */
    testUploadSpeedWebSocket(size, delay = 0) {
        const index = this.test.upload.index++;

        return new Promise((resolve, reject) => {
            if (STATUS.ABORTED === this.status) {
                return reject({
                    status: STATUS.ABORTED
                });
            }

            if (STATUS.DONE === this.test.upload.status) {
                return resolve();
            }

            const endpoint = `${this.config.websocket.protocol}://${this
                .config.websocket.host}/${
                this.config.upload.websocket.path
            }`;
            const socket = new WebSocket(endpoint);
            socket.binaryType = "arraybuffer";

            this.requests[index] = socket;
            socket.addEventListener('message', () => {
                if (STATUS.ABORTED === this.status) {
                    socket.close();
                    return reject({ status: STATUS.ABORTED });
                }

                if (STATUS.DONE === this.test.upload.status) {
                    socket.close();
                    return resolve();
                }

                if (STATUS.RUNNING === this.test.upload.status) {
                    this.test.upload.size += this.test.upload.blob.size;
                }
                this.processUploadSpeedResults();

                socket.send(this.test.upload.blob);
            });

            socket.addEventListener('close', () => {
                Request.clearWebSocket(socket);
            });

            socket.addEventListener('error', () => {
                if (this.config.ignoreErrors) {
                    this.testUploadSpeedWebSocket(size)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                Request.clearWebSocket(socket);

                reject({
                    status: STATUS.FAILED,
                    error: "test failed"
                });
            });

            socket.addEventListener('open', () => {
                this.scope.setTimeout(() => {
                    socket.send(this.test.upload.blob);
                }, delay);
            });
        });
    }

    /**
     * Run the XHR based upload speed test
     *
     * @param {any} size
     * @param {number} [delay=0]
     * @returns {Promise}
     */
    testUploadSpeedXHR(size, delay = 0) {
        const index = this.test.upload.index++;

        return new Promise((resolve, reject) => {
            if (STATUS.ABORTED === this.status) {
                return reject({
                    status: STATUS.ABORTED
                });
            }

            if (STATUS.DONE === this.test.upload.status) {
                return resolve();
            }

            const endpoint = `${this.config.xhr.endpoint}/${
                this.config.upload.xhr.path
            }?${Uuid.v4()}`;

            const xhr = new XMLHttpRequest();

            this.requests[index] = xhr;

            let sizeLoaded = 0;
            xhr.open("POST", endpoint, true);
            xhr.setRequestHeader("Content-Encoding", "identity");
            xhr.upload.addEventListener("progress", e => {
                if (STATUS.ABORTED === this.status) {
                    Request.clearXMLHttpRequest(xhr);
                    return reject({ status: STATUS.ABORTED });
                }

                if (STATUS.DONE === this.test.upload.status) {
                    Request.clearXMLHttpRequest(xhr);
                    return resolve();
                }

                const loadDiff = e.loaded - sizeLoaded;
                sizeLoaded = e.loaded;

                if (STATUS.RUNNING === this.test.upload.status) {
                    this.test.upload.size += loadDiff;
                }
                this.processUploadSpeedResults();
            });

            xhr.upload.addEventListener("load", () => {
                Request.clearXMLHttpRequest(xhr);

                this.testUploadSpeedXHR(size)
                    .then(resolve)
                    .catch(reject);
            });

            xhr.upload.addEventListener("error", () => {
                Request.clearXMLHttpRequest(xhr);

                if (this.config.ignoreErrors) {
                    this.testUploadSpeedXHR(size)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                reject({
                    status: STATUS.FAILED,
                    error: "test failed"
                });
            });

            this.test.timeouts.push(
                this.scope.setTimeout(() => {
                    xhr.send(this.test.upload.blob);
                }, delay)
            );
        });
    }

    /**
     * Process the upload speed test results
     */
    processUploadSpeedResults() {
        this.results.upload = {
            status: this.test.upload.status,
            progress: 0
        };
        if (this.test.upload.status <= STATUS.WAITING) {
            return;
        }

        const durationFromInit =
            (Date.now() - this.test.upload.initDate) / 1000;
        const durationFromStart =
            (Date.now() - this.test.upload.startDate) / 1000;
        const progress = durationFromInit / this.config.upload.duration;
        Object.assign(this.results.upload, {
            progress: progress
        });
        if (this.test.upload.status <= STATUS.STARTING) {
            return;
        }

        const { bitBandwidth: bandwidth } = Bandwidth.compute(
            this.test.upload.size,
            durationFromStart,
            this.config.overheadCompensation
        );
        this.results.upload = {
            speed: +bandwidth.toFixed(2),
            progress: progress
        };
    }

    /**
     * Run the speed test
     *
     * @returns {Promise}
     */
    async run() {
        if (this.running) {
            return new Promise((resolve, reject) => {
                reject({
                    status: this.status,
                    error: "Stop the current test before starting another one."
                });
            });
        }

        if (this.config.optimize) {
            // TODO: Auto adjust config to best values following the browser in use
        }

        Object.assign(this, {
            running: true,
            date: new Date().toJSON(),
            status: STATUS.STARTING,
            step: null,
            error: null,
            data: [],
            requests: [],
            test: {
                timeouts: []
            },
            results: {
                latency: null,
                download: null,
                upload: null
            }
        });

        this.status = STATUS.RUNNING;
        this.step = STEP.IP;
        return this.testIP()
            .then(() => {
                this.step = STEP.LATENCY;
                return this.testLatency();
            })
            .then(() => {
                this.step = STEP.DOWNLOAD;
                return this.testDownloadSpeed();
            })
            .then(() => {
                this.step = STEP.UPLOAD;
                return this.testUploadSpeed();
            })
            .then(() => {
                this.status = STATUS.DONE;
            })
            .catch(reason => {
                this.status = reason.status;
                this.error = reason.error;
            })
            .then(() => {
                this.running = false;
                this.step = null;

                Request.clearRequests(this.requests);

                if (STATUS.DONE !== this.status) {
                    throw {
                        status: this.status,
                        error: this.error
                    };
                }
            });
    }

    /**
     * Abort the speed test
     */
    abort() {
        this.status = STATUS.ABORTED;
        this.running = false;

        this.test.timeouts.forEach((timeoutIndex, index) => {
            this.scope.clearTimeout(timeoutIndex);
            delete this.test.timeouts[index];
        });

        Request.clearRequests(this.requests);
    }
}

new SpeedTestWorker(self);
