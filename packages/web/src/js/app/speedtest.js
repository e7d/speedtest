import { UI } from "./ui";
import Results from "./results";
import WorkerService from "./workerService";

export default class SpeedTest {
  constructor() {
    this.workerService = new WorkerService();
  }

  /**
   * Start a speed test
   */
  startTest() {
    UI.$startButton.setAttribute("hidden", "");
    UI.$stopButton.removeAttribute("hidden");

    UI.setProgressBar(0);
    UI.clearResults();

    this.workerService.start();
  }

  /**
   * Abort a running speed test
   */
  stopTest(clearResults = false) {
    this.workerService.abort();

    UI.setProgressBar(0);
    UI.resetHiglightStep();
    if (clearResults) UI.clearResults();
  }

  /**
   * Load results from the URI id
   */
  loadResults() {
    Results.loadFromUri().catch(() => {
      UI.$unknownResultsAlert.removeAttribute("hidden");
    });
  }
}
