import Results from "./results";

export default class History {
    constructor(ui) {
        this.ui = ui;
        this.results = {};

        this.attachEventHandlers();
    }

    /**
     * Attach event handlers to the UI
     */
    attachEventHandlers() {
        this.ui.$eraseHistoryButton.addEventListener(
            "click",
            this.eraseHistoryButtonClickHandler.bind(this)
        );
    }

    /**
     * Select the share result link on text input click
     */
    eraseHistoryButtonClickHandler() {
        if (
            Object.entries(this.results).length === 0 ||
            !window.confirm(
                "The results history will be permanently deleted. Are you sure you want to delete it?"
            )
        )
            return;

        localStorage.removeItem("history");
        this.loadResultsHistory();
    }

    /**
     * Load the results history from local storage
     *
     * @todo: Split data loading and HTML building
     */
    loadResultsHistory() {
        this.results = Object.assign(
            {},
            JSON.parse(localStorage.getItem("history"))
        );

        this.ui.$resultsHistory.innerHTML = "";
        if (Object.entries(this.results).length === 0) {
            this.printPlaceholder();
            return;
        }

        this.printResults();
    }

    printPlaceholder() {
        const $resultsRow = document.createElement("tr");
        $resultsRow.innerHTML =
            '<td class="text-center" colspan="99">No results</td>';
        this.ui.$resultsHistory.appendChild($resultsRow);
    }

    printResults() {
        let $resultsRow;
        Object.entries(this.results).forEach(([timestamp, results]) => {
            const date = new Date(+timestamp);
            $resultsRow = document.createElement("tr");
            $resultsRow.innerHTML = `
                <td>${date.toLocaleDateString()}<br>${date.toLocaleTimeString()}</td>
                <td>${results.latency.avg} ms</td>
                <td>${results.latency.jitter} ms</td>
                <td>${(results.download.speed / 1024 ** 2).toFixed(2)} Mbps</td>
                <td>${(results.upload.speed / 1024 ** 2).toFixed(2)} Mbps</td>
                <td>${results.ip}${
                results.asn ? `<br>(${results.asn})` : ""
            }</td>
                <td>
                    <a class="btn btn-link" href="share#${Results.toString(
                        results
                    )}"><i class="icon icon-link"></i></a>
                </td>
            `;
            this.ui.$resultsHistory.appendChild($resultsRow);
        });
    }
}
