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
            updateDelay: 500,   // 100
            endless: false,      // false
        };

        // prepare speed test worker
        this.worker = new Worker('worker.js');
        this.worker.onmessage = event => {
            this.processResponse(event);
        };

        this.$startButton = $('#commands button#start');
        this.$stopButton = $('#commands button#stop');
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
     *
     */
    startTest() {
        this.$startButton.addClass('hidden');
        this.$stopButton.removeClass('hidden');

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
     *
     */
    stopTest() {
        window.clearInterval(this.statusInterval);
        this.statusInterval = null;

        if (this.worker) {
            this.worker.postMessage('abort');
        }
    }

    /**
     *
     *
     * @param {MessageEvent} event
     */
    processResponse(event) {
        switch (_.get(event.data, 'status')) {
            case 'running':
                this.processResults(_.get(event.data, 'results', {}));
                break;
            case 'done':
                window.clearInterval(this.statusInterval);
                this.statusInterval = null;

                this.processResults(_.get(event.data, 'results', {}));
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

                this.processResults(_.get(event.data, 'results', {}));
                this.$startButton.removeClass('hidden');
                this.$stopButton.addClass('hidden');
                break;
        }
    }

    /**
     *
     *
     * @param {any} results
     */
    processResults(results) {
        this.$ipValue.html(
            _.get(results, 'ip', '')
        );
        this.$latencyValue.html(
            _.get(results, 'latency.avg', '')
        );
        this.$jitterValue.html(
            _.get(results, 'latency.jitter', '')
        );
        this.$downloadValue.html(
            _.get(results, 'download') ?
            (+results.download / (1024 * 1024)).toFixed(2) :
            ''
        );
        this.$uploadValue.html(
            _.get(results, 'upload') ?
            (+results.upload / (1024 * 1024)).toFixed(2) :
            ''
        );
    }
}

new App();
