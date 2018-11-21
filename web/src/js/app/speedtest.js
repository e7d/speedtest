import WorkerService from "./workerService";

export default class SpeedTest {
    constructor(ui) {
        this.ui = ui;
        this.workerService = new WorkerService(this.ui);
    }

    /**
     * Start a speed test.
     */
    startTest() {
        this.ui.$shareResultsButton.setAttribute("hidden", "");
        this.ui.$startButton.setAttribute("hidden", "");
        this.ui.$stopButton.removeAttribute("hidden");

        this.ui.setProgressBar(0);
        this.ui.clearResults();

        this.workerService.start();
    }

    /**
     * Abort a running speed test.
     */
    stopTest(clearResults = false) {
        this.workerService.abort();

        this.ui.setProgressBar(0);
        this.ui.resetHiglightStep();
        if (clearResults) this.ui.clearResults();
    }

    /**
     * Load the results from the currect URI
     */
    loadResultsFromUri() {
        const [
            latency,
            jitter,
            download,
            upload,
            ip,
            asn
        ] = window.location.hash.replace("#", "").split(",");

        this.ui.$ipValue.innerHTML = ip;
        this.ui.$asnValue.innerHTML = decodeURIComponent(asn);
        this.ui.$latencyValue.innerHTML = latency;
        this.ui.$jitterValue.innerHTML = jitter;
        this.ui.$downloadValue.innerHTML = (+download / (1024 * 1024)).toFixed(
            2
        );
        this.ui.$uploadValue.innerHTML = (+upload / (1024 * 1024)).toFixed(2);
    }
}
