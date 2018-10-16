//@ts-check

import SpeedTestWorker from "worker-loader!./worker";

/**
 * Speed Test web UI
 *
 * @class WebUI
 */
export default class WebUI {
    /**
     * Create an instance of WebUI.
     */
    constructor() {
        this.STATUS = {
            WAITING: 0,
            STARTING: 1,
            RUNNING: 2,
            DONE: 3,
            ABORTED: 4,
            FAILED: -1
        };

        this.statusInterval = null;

        this.config = {
            updateDelay: 150,
            endless: false // false
        };

        this.worker = new SpeedTestWorker();
        this.worker.addEventListener("message", event => {
            this.processResponse(event);
        });
        this.$shareButton = document.querySelector("#commands button#share");
        this.$startButton = document.querySelector("#commands button#start");
        this.$stopButton = document.querySelector("#commands button#stop");
        this.$httpsAlertMessage = document.querySelector("#https-alert");
        this.$ipResult = document.querySelector('#ip');
        this.$ipValue = document.querySelector("#ip span.value");
        this.$ipDetails = document.querySelector("#ip span.details");
        this.$latencyResult = document.querySelector('#latency');
        this.$latencyValue = document.querySelector("#latency span.value");
        this.$jitterResult = document.querySelector('#jitter');
        this.$jitterValue = document.querySelector("#jitter span.value");
        this.$downloadResult = document.querySelector('#download');
        this.$downloadValue = document.querySelector("#download span.value");
        this.$uploadResult = document.querySelector('#upload');
        this.$uploadValue = document.querySelector("#upload span.value");
        this.$progress = document.querySelector("#progress");
        this.$progressBar = document.querySelector("#progress .progress-bar");
        this.$credits = document.querySelector("#credits");

        this.$startButton.addEventListener("click", this.startTest.bind(this));
        this.$stopButton.addEventListener("click", this.stopTest.bind(this));
    }

    /**
     * Start a speed test.
     */
    startTest() {
        if (this.running) return;
        this.running = true;

        this.$shareButton.setAttribute("hidden", "");
        this.$startButton.setAttribute("hidden", "");
        this.$stopButton.removeAttribute("hidden");

        this.setProgressBar(0);
        this.resetResults();

        this.worker.postMessage("start");

        if (!this.config.updateDelay) return;
        if (this.config.updateDelay === "auto") {
            this.worker.postMessage("status");
        }
        window.clearInterval(this.statusInterval);
        this.statusInterval = window.setInterval(() => {
            this.worker.postMessage("status");
        }, this.config.updateDelay);
    }

    /**
     * Abort a running speed test.
     */
    stopTest() {
        if (!this.running) return;
        this.running = false;

        window.clearInterval(this.statusInterval);
        this.statusInterval = null;

        if (this.worker) this.worker.postMessage("abort");

        this.setProgressBar(0);
    }

    /**
     * Process an event response from the speed test Worker
     *
     * @param {MessageEvent} event
     */
    processResponse(event) {
        switch (event.data.status) {
            case this.STATUS.WAITING:
                if (!event.data.config.hideCredits) {
                    this.$credits.style.display = "block";
                }

                if (event.data.alerts.https) {
                    this.$httpsAlertMessage.style.display = "block";
                    this.$httpsAlertMessage.innerHTML = event.data.alerts.https;
                }
                break;
            case this.STATUS.RUNNING:
                this.processData(event.data || {});
                break;
            case this.STATUS.DONE:
                window.clearInterval(this.statusInterval);

                this.processData(event.data || {});
                if (this.config.endless) {
                    this.startTest();
                    return;
                }

                this.setProgressBar(0);

                this.$shareButton.removeAttribute("hidden");
                this.$startButton.removeAttribute("hidden");
                this.$stopButton.setAttribute("hidden", "");

                this.running = false;
                break;
            case this.STATUS.ABORTED:
                window.clearInterval(this.statusInterval);

                this.processData(event.data || {});
                this.$shareButton.setAttribute("hidden", "");
                this.$startButton.removeAttribute("hidden");
                this.$stopButton.setAttribute("hidden", "");
                break;
        }

        if (this.config.updateDelay == "auto") {
            window.requestAnimationFrame(
                this.worker.postMessage.bind(this, "status")
            );
        }
    }

    /**
     * Reset the current results.
     */
    resetResults() {
        this.$ipValue.innerHTML = "";
        this.$latencyValue.innerHTML = "";
        this.$jitterValue.innerHTML = "";
        this.$downloadValue.innerHTML = "";
        this.$uploadValue.innerHTML = "";
    }

    /**
     * Process a set of data.
     *
     * @param {any} data
     */
    processData(data) {
        document
            .querySelectorAll(".result")
            .forEach(elem => elem.classList.remove("active"));
        if (!this.running) {
            return;
        }

        switch (data.step) {
            case "ip":
                if (!data.results.ip) return;
                this.$ipValue.innerHTML = data.results.ip;
                this.$ipDetails.innerHTML = "";
                this.getIpInfo(data.results.ip).then(info => {
                    if (info.bogon) return;

                    const details = [];
                    if (info.org) details.push(info.org);
                    if (info.country) details.push(info.country);
                    if (info.loc)
                        details.push(
                            `<a href="https://www.google.com/maps/search/${
                                info.loc
                            },10Z" target="_blank">🗺️</a>`
                        );

                    this.$ipDetails.innerHTML = details.join(" - ");
                });
                break;
            case "latency":
                this.$latencyResult.classList.add("active");
                this.$jitterResult.classList.add("active");
                this.$latencyValue.innerHTML = data.results.latency.avg || "";
                this.$jitterValue.innerHTML = data.results.latency.jitter || "";
                this.setProgressBar(data.results.latency.progress);
                break;
            case "download":
                this.$downloadResult.classList.add("active");
                const downloadValue = data.results.download
                    ? +data.results.download.speed / (1024 * 1024)
                    : 0;
                this.$downloadValue.innerHTML = downloadValue
                    ? downloadValue.toFixed(2)
                    : "";
                this.setProgressBar(data.results.download.progress, "download");
                break;
            case "upload":
                this.$uploadResult.classList.add("active");
                const uploadValue = data.results.upload
                    ? +data.results.upload.speed / (1024 * 1024)
                    : 0;
                this.$uploadValue.innerHTML = uploadValue
                    ? uploadValue.toFixed(2)
                    : "";
                this.setProgressBar(data.results.upload.progress);
                break;
        }
    }

    /**
     * Set a value on the progress bar
     *
     * @param {*} progress
     * @param {*} mode
     */
    setProgressBar(progress, mode = "") {
        if (this.config.updateDelay === "auto") {
            this.$progressBar.style.transition = "unset";
        }
        this.$progress.style.flexDirection =
            mode === "download" ? "row-reverse" : "row";
        this.$progressBar.style.width = progress * 100 + "%";
    }

    getIpInfo(ip) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.addEventListener("readystatechange", () => {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if (xhr.status === 200) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        reject(xhr.statusText);
                    }
                }
            });
            xhr.open("GET", `//ipinfo.io/${ip}/json`, true);
            xhr.send(null);
        });
    }
}
