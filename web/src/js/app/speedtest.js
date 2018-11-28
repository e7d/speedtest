import { UI } from "./ui";
import WorkerService from "./workerService";

export default class SpeedTest {
    constructor() {
        this.workerService = new WorkerService();
    }

    /**
     * Start a speed test.
     */
    startTest() {
        UI.$shareResultsButton.setAttribute("hidden", "");
        UI.$startButton.setAttribute("hidden", "");
        UI.$stopButton.removeAttribute("hidden");

        UI.setProgressBar(0);
        UI.clearResults();

        this.workerService.start();
    }

    /**
     * Abort a running speed test.
     */
    stopTest(clearResults = false) {
        this.workerService.abort();

        UI.setProgressBar(0);
        UI.resetHiglightStep();
        if (clearResults) UI.clearResults();
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

        UI.$ipValue.innerHTML = ip;
        UI.$asnValue.innerHTML = decodeURIComponent(asn);
        UI.$latencyValue.innerHTML = latency;
        UI.$jitterValue.innerHTML = jitter;
        UI.$downloadValue.innerHTML = (+download / (1024 * 1024)).toFixed(
            2
        );
        UI.$uploadValue.innerHTML = (+upload / (1024 * 1024)).toFixed(2);
    }
}
