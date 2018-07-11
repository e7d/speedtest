//@ts-check

/**
 * Speed Test worker
 *
 * @class SpeedTestWorker
 */
export default class SpeedTestWorker {
// class SpeedTestWorker {
    /**
     * Creates an instance of SpeedTestWorker.
     * @param {any} scope
     */
    constructor(scope = self) {
        this.scope = scope;

        this.STATUS = {
            WAITING: 'waiting',
            STARTING: 'starting',
            RUNNING: 'running',
            DONE: 'done',
            ABORTED: 'aborted',
            FAILED: 'failed',
        };
        this.STEP = {
            IP: 'ip',
            LATENCY: 'latency',
            DOWNLOAD: 'download',
            UPLOAD: 'upload',
        };
        this.OVERHEAD = {
            'HTTP+TCP+IPv4': 1500 / (1500 - 40), // 40 bytes per 1500 bytes payload
            'HTTP+TCP+IPv6': 1500 / (1500 - 60), // 60 bytes per 1500 bytes payload
        };

        this.test = {
            running: false,
            status: this.STATUS.WAITING,
            step: null,
            error: false,
            data: {},
            requests: [],
        };

        this.config = {
            ignoreErrors: true,
            optimize: false,
            mode: 'xhr', // 'websocket' or 'xhr'
            websocket: {
                protocol : 'ws', // 'ws' or 'wss'
                host: 'localhost',
                port: 80,
            },
            overheadCompensation: this.OVERHEAD['HTTP+TCP+IPv4'],
            ip: {
                endpoint: 'ip',
            },
            latency: {
                websocket: {
                    path: '/ping',
                },
                xhr: {
                    endpoint: 'ping',
                },
                count: null,
                duration: 5,
                gracetime: 1,
            },
            download: {
                websocket: {
                    path: '/download',
                    streams: 20,
                    size: 1 * 1024 * 1024,
                },
                xhr: {
                    endpoint: 'download',
                    streams: 5,
                    size: 8 * 1024 * 1024,
                    responseType: "blob", // 'arraybuffer' or 'blob'
                },
                duration: 10,
                gracetime: 2,
            },
            upload: {
                websocket: {
                    path: '/upload',
                    streams: 20,
                    size: 1 * 1024 * 1024,
                },
                xhr: {
                    endpoint: 'upload',
                    streams: 3,
                    size: 1 * 1024 * 1024,
                },
                duration: 10,
                gracetime: 2,
            },
        };

        this.scope.addEventListener('message', this.processMessage.bind(this));

        return this;
    }

    /**
     * Process incoming event message
     *
     * @param {any} event
     */
    processMessage(event) {
        switch (event.data) {
            case 'abort':
                this.abort();
                this.postStatus();
                break;
            case 'config':
                this.postMessage(this.test.config);
                break;
            case 'start':
                this.run()
                    .then(() => {
                        this.postStatus();
                    })
                    .catch(reason => {
                        console.error('FAIL', reason);
                    });
                break;
            case 'status':
                this.postStatus();
                break;
        }
    }

    /**
     * Post a message
     */
    postMessage(message) {
        this.scope.postMessage(message, this.scope.location.href);
    }

    /**
     * Post a message with the current status
     */
    postStatus() {
        this.postMessage({
            'status': this.test.status,
            'step': this.test.step,
            'results': this.test.results
        });
    }

    /**
     * Read browser most recent PerformanceEntry matching a given path
     *
     * @param {any} path
     * @returns {PerformanceNavigationTiming}
     */
    getPerformanceEntry(path) {
        let performanceEntry = null;

        // TODO: Fix for Firefox and IE 11 as they have partial performance object in scope
        this.scope.performance.getEntries().reverse().forEach(entry => {
            if (new RegExp(path.replace('?', '\\?')).test(entry.name)) {
                performanceEntry = entry;
            }
        }, this);

        if (this.scope.performance.getEntries().length > 120) {
            this.scope.performance.clearResourceTimings();
        }

        return performanceEntry;
    }

    /**
     * Clear a collection of WebSocket/XHR
     *
     * @param {any} requests
     * @returns {Promise}
     */
    clearRequests(requests) {
        if (!Array.isArray(requests) ||
            0 === requests.length
        ) {
            return;
        }

        requests.forEach((request, index) => {
            if (request instanceof WebSocket) {
                this.clearWebSocket(request);
            }

            if (request instanceof XMLHttpRequest) {
                this.clearXMLHttpRequest(request);
            }

            try {
                request = null;
                delete(requests[index]);
            } catch (ex) {}
        }, this);

        requests = null;
    }

    /**
     * Clear an ongoing WebSocket
     *
     * @param {WebSocket} socket
     */
    clearWebSocket(socket) {
        try {
            socket.close();
        } catch (ex) {}

        try {
            socket.onopen = null;
            socket.onmessage = null;
            socket.onclose = null;
            socket.onerror = null;
        } catch (ex) {}
    }

    /**
     * Clear an ongoing XHR
     *
     * @param {XMLHttpRequest} xhr
     */
    clearXMLHttpRequest(xhr) {
        try {
            xhr.abort();
        } catch (ex) {}

        try {
            xhr.onprogress = null;
            xhr.onload = null;
            xhr.onerror = null;
        } catch (ex) {}
        try {
            xhr.upload.onprogress = null;
            xhr.upload.onload = null;
            xhr.upload.onerror = null;
        } catch (ex) {}
    }

    /**
     * Run the IP test
     *
     * @returns {Promise}
     */
    testIP() {
        const run = () => {
            return new Promise((resolve, reject) => {
                const endpoint = this.config.ip.endpoint +
                    '?' + new Date().getTime();
                const xhr = new XMLHttpRequest();

                xhr.open('GET', endpoint, true);
                xhr.onload = () => {
                    this.test.results.ip = xhr.response;
                    this.clearXMLHttpRequest(xhr);

                    resolve();
                };
                xhr.onerror = () => {
                    reject({
                        status: this.STATUS.FAILED,
                        error: 'test failed',
                    });
                };
                xhr.send();
            });
        };

        this.ip = {
            status: this.STATUS.STARTING,
            running: true,
            data: []
        };

        return run()
            .catch(reason => {
                this.ip.error = reason;
                this.test.results.ip = null;
            })
            .then(() => {
                this.ip.running = false;
                this.processMessage({
                    data: 'status'
                });
                this.clearRequests(this.test.requests);

                if (this.ip.error) {
                    throw (this.ip.error);
                }
            });
    }

    /**
     * Run the latency test
     *
     * @returns {Promise}
     */
    testLatency() {
        const run = (delay = 0) =>
            'websocket' === this.config.mode ?
                this.testLatencyWebSocket(delay) :
                this.testLatencyXHR(delay);

        this.latency = {
            initDate: Date.now(),
            status: this.STATUS.STARTING,
            running: true,
            data: [],
            test: {
                pingDate: []
            }
        };

        this.scope.setTimeout(
            () => {
                this.latency.status = this.STATUS.RUNNING;
                this.latency.startDate = Date.now();
            },
            this.config.latency.gracetime * 1000
        );
        this.scope.setTimeout(
            () => {
                this.latency.status = this.STATUS.DONE;
                this.latency.running = false;
            },
            this.config.latency.duration * 1000
        );

        return run()
            .then(() => this.processLatencyResults)
            .catch(reason => {
                this.latency.error = reason;
                this.test.results.latency = null;
            })
            .then(() => {
                this.latency.running = false;
                this.clearRequests(this.test.requests);

                if (this.latency.error) {
                    throw (this.latency.error);
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
            if (this.STATUS.ABORTED === this.test.status) {
                return reject({
                    status: this.STATUS.ABORTED
                });
            }

            if (this.STATUS.DONE === this.latency.status) {
                return resolve();
            }

            const endpoint = `${this.config.websocket.protocol}://${this.config.websocket.host}:${this.config.websocket.port}/${this.config.latency.websocket.path}`;
            const socket = new WebSocket(endpoint);
            this.test.requests[index] = socket;

            socket.onmessage = e => {
                if (this.STATUS.ABORTED === this.test.status) {
                    socket.close();
                    return reject({ status: this.STATUS.ABORTED });
                }

                if (this.STATUS.DONE === this.latency.status) {
                    socket.close();
                    return resolve();
                }

                if (this.STATUS.RUNNING === this.latency.status) {
                    const data = JSON.parse(e.data);
                    const index = data.index;
                    let networkLatency = Date.now() - this.latency.test.pingDate[index];
                    networkLatency = +networkLatency.toFixed(2);
                    this.latency.data.push(networkLatency);
                }

                this.processLatencyResults();

                index += 1;
                this.latency.test.pingDate[index] = Date.now();
                socket.send(JSON.stringify({
                    'action': 'ping',
                    'index': index
                }));
            };

            socket.onclose = () => {
                this.clearWebSocket(socket);
            };

            socket.onerror = () => {
                if (this.config.ignoreErrors) {
                    this.testLatencyWebSocket()
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                this.clearWebSocket(socket);

                reject({
                    status: this.STATUS.FAILED,
                    error: 'test failed',
                });
            };

            socket.onopen = () => {
                this.scope.setTimeout(
                    () => {
                        index += 1;
                        this.latency.test.pingDate[index] = +new Date();
                        socket.send(JSON.stringify({
                            'action': 'ping',
                            'index': index
                        }));
                    },
                    delay
                );
            };
        });
    }

    /**
     * Run the XHR based latency test
     *
     * @param {number} [delay=0]
     * @returns {Promise}
     */
    testLatencyXHR(delay = 0) {
        const index = this.latency.test.index++;

        return new Promise((resolve, reject) => {
            if (this.STATUS.ABORTED === this.test.status) {
                return reject({
                    status: this.STATUS.ABORTED
                });
            }

            if (this.STATUS.DONE === this.latency.status) {
                return resolve();
            }

            const endpoint = this.config.latency.xhr.endpoint +
                '?' + new Date().getTime();
            const xhr = new XMLHttpRequest();
            this.test.requests[index] = xhr;

            xhr.open('GET', endpoint, true);
            xhr.onload = () => {
                const pongDate = Date.now();

                if (this.STATUS.ABORTED === this.test.status) {
                    return reject({ status: this.STATUS.ABORTED });
                }

                if (this.STATUS.DONE === this.latency.status) {
                    return resolve();
                }

                if (this.STATUS.RUNNING === this.latency.status) {
                    const performanceEntry = this.getPerformanceEntry(endpoint);
                    let networkLatency = null !== performanceEntry ?
                        performanceEntry.responseStart - performanceEntry.requestStart :
                        pongDate - pingDate;

                    networkLatency = +networkLatency.toFixed(2);
                    this.latency.data.push(networkLatency);
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
            };
            xhr.onerror = () => {
                if (this.config.ignoreErrors) {
                    this.testLatencyXHR()
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                reject({
                    status: this.STATUS.FAILED,
                    error: 'test failed',
                });
            };

            let pingDate;
            this.scope.setTimeout(
                () => {
                    xhr.send();
                    pingDate = Date.now();
                },
                delay
            );
        });
    }

    /**
     * Process the latency test results
     *
     * @returns {Promise}
     */
    processLatencyResults() {
        const durationFromInit = (Date.now() - this.latency.initDate) / 1000;
        const progress = durationFromInit / this.config.latency.duration;
        const latencies = this.latency.data;

        this.test.results.latency = {
            min: +Math.min.apply(null, latencies).toFixed(2),
            max: +Math.max.apply(null, latencies).toFixed(2),
            avg: +(
                latencies.reduce((a, b) => a + b, 0) /
                latencies.length
            ).toFixed(2),
            jitter: 0,
            progress: progress
        };

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
            this.test.results.latency.jitter += (deltaPing - this.test.results.latency.jitter) / 16.0;
        }, this);
        this.test.results.latency.jitter = +this.test.results.latency.jitter.toFixed(2);
    }

    /**
     * Run the download speed test
     *
     * @returns {Promise}
     */
    testDownloadSpeed() {
        const run = (size, delay = 0) =>
            'websocket' === this.config.mode ?
                this.testDownloadSpeedWebSocket(size, delay) :
                this.testDownloadSpeedXHR(size, delay);

        this.download = {
            initDate: Date.now(),
            status: this.STATUS.STARTING,
            running: true,
            startDate: null,
            size: 0,
            test: {
                index: 0,
                promises: []
            }
        };

        this.download.test.promises = [];
        for (let index = 0; index < this.config.download[this.config.mode].streams; index++) {
            const testPromise = run(
                this.config.download[this.config.mode].size,
                index * 100
            );
            this.download.test.promises.push(testPromise);
        }

        this.scope.setTimeout(
            () => {
                this.download.status = this.STATUS.RUNNING;
                this.download.startDate = Date.now();
            },
            this.config.download.gracetime * 1000
        );
        this.scope.setTimeout(
            () => {
                this.download.status = this.STATUS.DONE;
                this.download.running = false;
            },
            this.config.download.duration * 1000
        );

        return Promise.all(this.download.test.promises)
            .then(() => this.processDownloadSpeedResults)
            .catch(reason => {
                this.download.error = reason;
                this.test.results.latency = null;
            })
            .then(() => {
                this.download.running = false;
                this.clearRequests(this.test.requests);

                if (this.download.error) {
                    throw (this.download.error);
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
        const index = this.download.test.index++;

        return new Promise((resolve, reject) => {
            if (this.STATUS.ABORTED === this.test.status) {
                return reject({
                    status: this.STATUS.ABORTED
                });
            }

            if (this.STATUS.DONE === this.download.status) {
                return resolve();
            }

            const endpoint = `${this.config.websocket.protocol}://${this.config.websocket.host}:${this.config.websocket.port}/${this.config.download.websocket.path}`;
            const socket = new WebSocket(endpoint);
            // socket.binaryType = 'arraybuffer';
            this.test.requests[index] = socket;
            socket.onmessage = e => {
                if (this.STATUS.ABORTED === this.test.status) {
                    socket.close();
                    return reject({ status: this.STATUS.ABORTED });
                }

                if (this.STATUS.DONE === this.download.status) {
                    socket.close();
                    return resolve();
                }

                if (this.STATUS.RUNNING === this.download.status) {
                    this.download.size += e.data.size;
                }
                this.processDownloadSpeedResults();

                socket.send(JSON.stringify({
                    'action': 'download'
                }));
            };

            socket.onclose = () => {
                this.clearWebSocket(socket);
            };

            socket.onerror = () => {
                if (this.config.ignoreErrors) {
                    this.testDownloadSpeedWebSocket(size)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                this.clearWebSocket(socket);

                reject({
                    status: this.STATUS.FAILED,
                    error: 'test failed',
                });
            };

            socket.onopen = () => {
                this.scope.setTimeout(
                    () => {
                        socket.send(JSON.stringify({
                            'action': 'prepare',
                            'size': this.config.download.websocket.size
                        }));

                        socket.send(JSON.stringify({
                            'action': 'download'
                        }));
                    },
                    delay
                );
            };
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
        const index = this.download.test.index++;

        return new Promise((resolve, reject) => {
            if (this.STATUS.ABORTED === this.test.status) {
                return reject({
                    status: this.STATUS.ABORTED
                });
            }

            if (this.STATUS.DONE === this.download.status) {
                return resolve();
            }

            const endpoint = this.config.download.xhr.endpoint +
                '?' + new Date().getTime() +
                '&size=' + size;

            const xhr = new XMLHttpRequest();
            this.test.requests[index] = xhr;
            Object.assign(xhr, {
                responseType: this.config.download.xhr.responseType
            });

            let sizeLoaded = 0;
            xhr.open('GET', endpoint, true);
            xhr.onprogress = e => {
                if (this.STATUS.ABORTED === this.test.status) {
                    this.clearXMLHttpRequest(xhr);
                    reject({ status: this.STATUS.ABORTED });
                    return;
                }

                if (this.STATUS.DONE === this.download.status) {
                    this.clearXMLHttpRequest(xhr);
                    resolve();
                    return;
                }

                const loadDiff = e.loaded - sizeLoaded;
                sizeLoaded = e.loaded;
                if (this.STATUS.RUNNING === this.download.status) {
                    this.download.size += loadDiff;
                }
                this.processDownloadSpeedResults();
            };
            xhr.onload = () => {
                // this.clearXMLHttpRequest(xhr);
                this.testDownloadSpeedXHR(size)
                    .then(resolve)
                    .catch(reject);
            };
            xhr.onerror = () => {
                if (this.config.ignoreErrors) {
                    this.testDownloadSpeedXHR(size)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                reject({
                    status: this.STATUS.FAILED,
                    error: 'test failed',
                });
            };

            this.scope.setTimeout(
                () => xhr.send(null),
                delay
            );
        });
    }

    /**
     * Process the download speed test results
     */
    processDownloadSpeedResults() {
        const durationFromInit = (Date.now() - this.download.initDate) / 1000;
        const durationFromStart = (Date.now() - this.download.startDate) / 1000;
        const progress = durationFromInit / this.config.download.duration;

        const {
            bitBandwidth: bandwidth
        } = this.computeBandwidth(this.download.size, durationFromStart);

        this.test.results.download = {
            speed: +bandwidth.toFixed(2),
            progress: progress,
        };
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

        const dataSize = this.config.upload[this.config.mode].size;
        let data = new Float32Array(new ArrayBuffer(dataSize));
        for (let i = 0; i < data.byteLength / buffer.byteLength; i++) {
            data.set(
                buffer,
                i * buffer.length
            );
        }

        return data;
    }

    /**
     * Produce a Blob made of random data
     *
     * @returns {Blob}
     */
    getRandomBlob() {
        return new Blob(
            [this.getRandomData()],
            {
                type: 'application/octet-stream'
            }
        );
    }

    /**
     * Run the upload speed
     *
     * @returns {Promise}
     */
    testUploadSpeed() {
        const run = (size, delay = 0) =>
            'websocket' === this.config.mode ?
                this.testUploadSpeedWebSocket(size, delay) :
                this.testUploadSpeedXHR(size, delay);

        this.upload = {
            initDate: Date.now(),
            status: this.STATUS.STARTING,
            running: true,
            startDate: null,
            size: 0,
            test: {
                index: 0,
                promises: [],
                // data: this.getRandomData(),
                blob: this.getRandomBlob()
            }
        };

        this.upload.test.promises = [];
        for (let index = 0; index < this.config.upload[this.config.mode].streams; index++) {
            const testPromise = run(
                this.config.upload[this.config.mode].size,
                index * 100
            );
            this.upload.test.promises.push(testPromise);
        }

        this.scope.setTimeout(
            () => {
                this.upload.status = this.STATUS.RUNNING;
                this.upload.startDate = Date.now();
            },
            this.config.upload.gracetime * 1000
        );
        this.scope.setTimeout(
            () => {
                this.upload.status = this.STATUS.DONE;
                this.upload.running = false;
            },
            this.config.upload.duration * 1000
        );

        return Promise.all(this.upload.test.promises)
            .then(() => this.processUploadSpeedResults)
            .catch(reason => {
                this.upload.error = reason;
                this.test.results.latency = null;
            })
            .then(() => {
                this.upload.running = false;
                this.clearRequests(this.test.requests);

                if (this.upload.error) {
                    throw (this.upload.error);
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
        const index = this.upload.test.index++;

        return new Promise((resolve, reject) => {
            if (this.STATUS.ABORTED === this.test.status) {
                return reject({
                    status: this.STATUS.ABORTED
                });
            }

            if (this.STATUS.DONE === this.upload.status) {
                return resolve();
            }

            const endpoint = `${this.config.websocket.protocol}://${this.config.websocket.host}:${this.config.websocket.port}/${this.config.upload.websocket.path}`;
            const socket = new WebSocket(endpoint);
            socket.binaryType = 'arraybuffer';

            this.test.requests[index] = socket;
            socket.onmessage = e => {
                if (this.STATUS.ABORTED === this.test.status) {
                    socket.close();
                    return reject({ status: this.STATUS.ABORTED });
                }

                if (this.STATUS.DONE === this.upload.status) {
                    socket.close();
                    return resolve();
                }

                if (this.STATUS.RUNNING === this.upload.status) {
                    this.upload.size += this.upload.test.blob.size;
                }
                this.processUploadSpeedResults();

                socket.send(this.upload.test.blob);
            };

            socket.onclose = () => {
                this.clearWebSocket(socket);
            };

            socket.onerror = () => {
                if (this.config.ignoreErrors) {
                    this.testUploadSpeedWebSocket(size)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                this.clearWebSocket(socket);

                reject({
                    status: this.STATUS.FAILED,
                    error: 'test failed',
                });
            };

            socket.onopen = () => {
                this.scope.setTimeout(
                    () => {
                        socket.send(this.upload.test.blob);
                    },
                    delay
                );
            };
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
        const index = this.upload.test.index++;

        return new Promise((resolve, reject) => {
            if (this.STATUS.ABORTED === this.test.status) {
                return reject({
                    status: this.STATUS.ABORTED
                });
            }

            if (this.STATUS.DONE === this.upload.status) {
                return resolve();
            }

            const endpoint = this.config.upload.xhr.endpoint +
                '?' + new Date().getTime();

            const xhr = new XMLHttpRequest();

            this.test.requests[index] = xhr;

            let sizeLoaded = 0;
            xhr.open('POST', endpoint, true);
            xhr.setRequestHeader('Content-Encoding', 'identity');
            xhr.upload.onprogress = e => {
                if (this.STATUS.ABORTED === this.test.status) {
                    this.clearXMLHttpRequest(xhr);
                    return reject({ status: this.STATUS.ABORTED });
                }

                if (this.STATUS.DONE === this.upload.status) {
                    this.clearXMLHttpRequest(xhr);
                    return resolve();
                }

                const loadDiff = e.loaded - sizeLoaded;
                sizeLoaded = e.loaded;

                if (this.STATUS.RUNNING === this.upload.status) {
                    this.upload.size += loadDiff;
                }
                this.processUploadSpeedResults();
            };

            xhr.upload.onload = () => {
                // this.scope.setTimeout(
                //     () => {
                //         this.clearXMLHttpRequest(xhr);
                //     }
                // );
                this.testUploadSpeedXHR(size)
                    .then(resolve)
                    .catch(reject);
            };

            xhr.upload.onerror = () => {
                if (this.config.ignoreErrors) {
                    this.testUploadSpeedXHR(size)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                reject({
                    status: this.STATUS.FAILED,
                    error: 'test failed',
                });
            };

            this.scope.setTimeout(
                () => {
                    xhr.send(this.upload.test.blob);
                },
                delay
            );
        });
    }

    /**
     * Process the upload speed test results
     */
    processUploadSpeedResults() {
        const durationFromInit = (Date.now() - this.upload.initDate) / 1000;
        const durationFromStart = (Date.now() - this.upload.startDate) / 1000;
        const progress = durationFromInit / this.config.upload.duration;

        const {
            bitBandwidth: bandwidth
        } = this.computeBandwidth(this.upload.size, durationFromStart);

        this.test.results.upload = {
            speed: +bandwidth.toFixed(2),
            progress: progress,
        };
    }

    /**
     * Compute the bandwidth used from data use over time
     *
     * @param {number} size
     * @param {number} duration
     * @returns {Object}
     */
    computeBandwidth(size, duration) {
        const byteBandwidth =
            (size / duration) *
            this.config.overheadCompensation;
        const bitBandwidth = 8 * byteBandwidth;

        return {
            byteBandwidth: byteBandwidth,
            bitBandwidth: bitBandwidth,
        };
    }

    /**
     * Run the speed test
     *
     * @returns {Promise}
     */
    run() {
        if (this.test.running) {
            return new Promise((resolve, reject) => {
                reject({
                    status: this.test.status,
                    error: 'Stop the current test before starting another one.',
                });
            });
        }

        // TODO: Auto adjust config to best values following the browser in use
        if (this.config.optimize) {
            // this.config = JSON.parse(JSON.stringify(this.defaultConfig));
        }

        this.test = {
            running: true,
            date: new Date().toJSON(),
            status: this.STATUS.STARTING,
            step: null,
            error: null,
            data: [],
            requests: [],
            results: {
                latency: null,
                download: null,
                upload: null,
            },
        };

        this.test.status = this.STATUS.RUNNING;
        this.test.step = this.STEP.IP;
        return this.testIP()
            .then(() => {
                this.test.step = this.STEP.LATENCY;
                return this.testLatency();
            })
            .then(() => {
                this.test.step = this.STEP.DOWNLOAD;
                return this.testDownloadSpeed();
            })
            .then(() => {
                this.test.step = this.STEP.UPLOAD;
                return this.testUploadSpeed();
            })
            .then(() => {
                this.test.status = this.STATUS.DONE;
            })
            .catch(reason => {
                this.test.status = reason.status;
                this.test.error = reason.error;
            })
            .then(() => {
                this.test.running = false;
                this.test.step = null;

                this.clearRequests(this.test.requests);

                if (this.STATUS.DONE !== this.test.status) {
                    throw ({
                        status: this.test.status,
                        error: this.test.error,
                    });
                }
            });
    }

    /**
     * Abort the speed test
     */
    abort() {
        this.test.status = this.STATUS.ABORTED;
        this.test.running = false;

        this.clearRequests(this.test.requests);
    }
}
