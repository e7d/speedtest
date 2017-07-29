//@ts-check

import _ from 'lodash';
import $ from 'jquery';

/**
 *
 *
 * @class App
 */
class App {
    /**
     * Creates an instance of App.
     */
    constructor() {
        this.statusInterval = null;

        // prepare default config
        this.config = {
            updateDelay: 200, // 100
            endless: false, // false
        };

        // prepare speed test worker
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
     *
     */
    startTest() {
        this.running = true;

        this.$startButton.addClass('hidden');
        this.$stopButton.removeClass('hidden');

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
     *
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
     *
     *
     * @param {MessageEvent} event
     */
    processResponse(event) {
        switch (_.get(event.data, 'status')) {
            case 'running':
                this.processData(_.get(event, 'data', {}));
                break;
            case 'done':
                window.clearInterval(this.statusInterval);
                this.statusInterval = null;

                this.processData(_.get(event, 'data', {}));
                if (this.config.endless) {
                    this.startTest();
                    return;
                }
                this.$startButton.removeClass('hidden');
                this.$stopButton.addClass('hidden');
                break;
            case 'aborted':
                window.clearInterval(this.statusInterval);
                this.statusInterval = null;

                this.processData(_.get(event, 'data', {}));
                this.$startButton.removeClass('hidden');
                this.$stopButton.addClass('hidden');
                break;
        }
    }

    /**
     *
    */
    resetMeters() {
        this.setGauge(this.$gauge, 0);
        this.setProgressBar(this.$progressBar, 0);
    }

    /**
     *
    */
    resetResults() {
        this.$ipValue.empty();
        this.$latencyValue.empty();
        this.$jitterValue.empty();
        this.$downloadValue.empty();
        this.$uploadValue.empty();
    }

    /**
     *
     *
     * @param {any} data
     */
    processData(data) {
        if (!this.running) {
            return;
        }

        switch (_.get(data, 'step')) {
            case 'ip':
                this.$ipValue.html(
                    _.get(data, 'results.ip', '')
                );
                break;
            case 'latency':
                this.$latencyValue.html(
                    _.get(data, 'results.latency.avg', '')
                );
                this.$jitterValue.html(
                    _.get(data, 'results.latency.jitter', '')
                );
                this.setProgressBar(this.$progressBar, _.get(data, 'results.latency.progress', 0));
                break;
            case 'download':
                const downloadValue = _.get(data, 'results.download') ?
                    (+data.results.download.speed / (1024 * 1024)) :
                    0;
                this.$downloadValue.html(downloadValue ? downloadValue.toFixed(2) : '');
                this.setGauge(this.$gauge, (downloadValue / 1024));
                this.setProgressBar(this.$progressBar, _.get(data, 'results.download.progress', 0));
                break;
            case 'upload':
                const uploadValue = _.get(data, 'results.upload') ?
                    (+data.results.upload.speed / (1024 * 1024)) :
                    0;
                this.$uploadValue.html(uploadValue ? uploadValue.toFixed(2) : '');
                this.setGauge(this.$gauge, (uploadValue / 1024));
                this.setProgressBar(this.$progressBar, _.get(data, 'results.upload.progress', 0));
                break;
        }
    }

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

    setProgressBar($progressBar, progress = 0) {
        $progressBar.css({
            width: progress * 100 + '%'
        });
    }
}

new App();
