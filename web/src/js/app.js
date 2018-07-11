//@ts-check

import SpeedTestWorker from './worker';

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
        this.statusInterval = null;

        this.config = {
            updateDelay: 200, // 100
            endless: false, // false
        };

        this.worker = new SpeedTestWorker();
        this.worker.scope.onmessage = event => {
            this.processResponse(event);
        };

        this.$startButton = document.querySelector('#commands button#start');
        this.$stopButton = document.querySelector('#commands button#stop');
        this.$progress = document.querySelector('#progress');
        this.$progressBar = document.querySelector('#progress .progress-bar');
        this.$ipValue = document.querySelector('#ip span.value');
        this.$latencyValue = document.querySelector('#latency span.value');
        this.$jitterValue = document.querySelector('#jitter span.value');
        this.$downloadValue = document.querySelector('#download span.value');
        this.$uploadValue = document.querySelector('#upload span.value');

        this.$startButton.addEventListener('click', this.startTest.bind(this));
        this.$stopButton.addEventListener('click', this.stopTest.bind(this));
    }

    /**
     * Start a speed test.
     */
    startTest() {
        this.running = true;

        this.$startButton.hidden = true;
        this.$stopButton.hidden = false;

        this.resetMeters();
        this.resetResults();

        if (
            this.config.updateDelay &&
            !this.statusInterval
        ) {
            this.statusInterval = window.setInterval(
                () => {
                    this.worker.scope.postMessage('status', location.href);
                    // this.worker.processMessage({data: 'status'});
                },
                this.config.updateDelay
            );
        }
        this.worker.scope.postMessage('start', location.href);
        // this.worker.processMessage({data: 'start'});
    }

    /**
     * Abort a running speed test.
     */
    stopTest() {
        this.running = false;

        window.clearInterval(this.statusInterval);
        this.statusInterval = null;

        if (this.worker) {
            this.worker.scope.postMessage('abort', location.href);
            // this.worker.processMessage({data: 'abort'});
        }

        this.resetMeters();
    }

    /**
     * Process an event response from the speed test Worker
     *
     * @param {MessageEvent} event
     */
    processResponse(event) {
        switch (event.data.status) {
            case 'running':
                this.processData(event.data || {});
                break;
            case 'done':
                window.clearInterval(this.statusInterval);
                this.statusInterval = null;

                this.processData(event.data || {});
                if (this.config.endless) {
                    this.startTest();
                    return;
                }

                this.resetMeters();

                this.$startButton.hidden = false;
                this.$stopButton.hidden = true;
                break;
            case 'aborted':
                window.clearInterval(this.statusInterval);
                this.statusInterval = null;

                this.processData(event.data || {});
                this.$startButton.hidden = false;
                this.$stopButton.hidden = true;
                break;
        }
    }

    /**
     * Reset the current meters.
     */
    resetMeters() {
        this.setProgressBar(0);
    }

    /**
     * Reset the current results.
     */
    resetResults() {
        this.$ipValue.innerHTML = '';
        this.$latencyValue.innerHTML = '';
        this.$jitterValue.innerHTML = '';
        this.$downloadValue.innerHTML = '';
        this.$uploadValue.innerHTML = '';
    }

    /**
     * Process a set of data.
     *
     * @param {any} data
     */
    processData(data) {
        if (!this.running) {
            return;
        }

        switch (data.step) {
            case 'ip':
                this.$ipValue.innerHTML = data.results.ip;
                break;
            case 'latency':
                this.$latencyValue.innerHTML = data.results.latency.avg;
                this.$jitterValue.innerHTML = data.results.latency.jitter;
                this.setProgressBar(data.results.latency.progress);
                break;
            case 'download':
                const downloadValue = data.results.download ?
                    (+data.results.download.speed / (1024 * 1024)) :
                    0;
                this.$downloadValue.innerHTML = downloadValue ? downloadValue.toFixed(2) : '';
                this.setProgressBar(data.results.download.progress, 'download');
                break;
            case 'upload':
                const uploadValue = data.results.upload ?
                    (+data.results.upload.speed / (1024 * 1024)) :
                    0;
                this.$uploadValue.innerHTML = uploadValue ? uploadValue.toFixed(2) : '';
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
    setProgressBar(progress, mode = '') {
        this.$progress.style.flexDirection = mode === 'download' ? 'row-reverse' : 'row';
        this.$progressBar.style.width = progress * 100 + '%';
    }
}
