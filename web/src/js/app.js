import $ from 'jquery';
import Worker from 'worker-loader!./worker.js';

/**
 * Speed Test web UI
 *
 * @class WebUI
 */
class WebUI {
    /**
     * Create an instance of WebUI.
     */
    constructor() {
        this.statusInterval = null;

        this.config = {
            updateDelay: 200, // 100
            endless: false, // false
        };

        this.worker = new Worker('worker.js');
        this.worker.onmessage = event => {
            this.processResponse(event);
        };

        this.$startButton = $('#commands button#start');
        this.$stopButton = $('#commands button#stop');
        this.$gauge = $('.gauge');
        this.$progressBar = $('.progress-bar');
        this.$ipValue = $('#results #ip span.value');
        this.$latencyValue = $('#results #latency span.value');
        this.$jitterValue = $('#results #jitter span.value');
        this.$downloadValue = $('#results #download span.value');
        this.$uploadValue = $('#results #upload span.value');

        this.$startButton.on('click', this.startTest.bind(this));
        this.$stopButton.on('click', this.stopTest.bind(this));
    }

    /**
     * Start a speed test.
     */
    startTest() {
        this.running = true;

        this.$startButton.attr('hidden', true);
        this.$stopButton.removeAttr('hidden');

        this.resetMeters();
        this.resetResults();

        if (
            this.config.updateDelay &&
            !this.statusInterval
        ) {
            this.statusInterval = window.setInterval(
                () => {
                    this.worker.postMessage('status');
                },
                this.config.updateDelay
            );
        }
        this.worker.postMessage('start');
    }

    /**
     * Abort a running speed test.
     */
    stopTest() {
        this.running = false;

        window.clearInterval(this.statusInterval);
        this.statusInterval = null;

        if (this.worker) {
            this.worker.postMessage('abort');
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

                this.$startButton.removeAttr('hidden');
                this.$stopButton.attr('hidden', true);
                break;
            case 'aborted':
                window.clearInterval(this.statusInterval);
                this.statusInterval = null;

                this.processData(event.data || {});
                this.$startButton.removeAttr('hidden');
                this.$stopButton.attr('hidden', true);
                break;
        }
    }

    /**
     * Reset the current meters.
     */
    resetMeters() {
        this.setGauge(this.$gauge, 0);
        this.setProgressBar(this.$progressBar, 0);
    }

    /**
     * Reset the current results.
     */
    resetResults() {
        this.$ipValue.empty();
        this.$latencyValue.empty();
        this.$jitterValue.empty();
        this.$downloadValue.empty();
        this.$uploadValue.empty();
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
                this.$ipValue.html(data.results.ip);
                break;
            case 'latency':
                this.$latencyValue.html(data.results.latency.avg);
                this.$jitterValue.html(data.results.latency.jitter);
                this.setProgressBar(this.$progressBar, data.results.latency.progress);
                break;
            case 'download':
                console.log(data.results);
                const downloadValue = data.results.download ?
                    (+data.results.download.speed / (1024 * 1024)) :
                    0;
                this.$downloadValue.html(downloadValue ? downloadValue.toFixed(2) : '');
                this.setGauge(this.$gauge, (downloadValue / 1024));
                this.setProgressBar(this.$progressBar, data.results.download.progress, 'download');
                break;
            case 'upload':
                const uploadValue = data.results.upload ?
                    (+data.results.upload.speed / (1024 * 1024)) :
                    0;
                this.$uploadValue.html(uploadValue ? uploadValue.toFixed(2) : '');
                this.setGauge(this.$gauge, (uploadValue / 1024));
                this.setProgressBar(this.$progressBar, data.results.upload.progress);
                break;
        }
    }

    /**
     * Set a value on the gauge
     *
     * @param {*} $gauge
     * @param {*} value
     */
    setGauge($gauge, value = null) {
        value = (value || $gauge.data('percentage') || 0);
        value = Math.max(0, Math.min(1, value));

        const degrees = 180 * value;
        const pointerDegrees = degrees - 90;
        const $spinner = $gauge.find('.spinner');
        const $pointer = $gauge.find('.pointer');
        $spinner.attr({
            style: 'transform: rotate(' + degrees + 'deg)'
        });
        $pointer.attr({
            style: 'transform: rotate(' + pointerDegrees + 'deg)'
        });
    }


    /**
     * Set a value on the progress bar
     *
     * @param {*} $progressBar
     * @param {*} progress
     * @param {*} mode
     */
    setProgressBar($progressBar, progress, mode) {
        $progressBar.css({
            width: progress * 100 + '%'
        });
    }
}

new WebUI();
