//@ts-check

import Results from "./results";

export default class History {
    constructor(ui) {
        this.ui = ui;
    }

    /**
     * Load the results history from local storage
     *
     * @todo: Split data loading and HTML building
     */
    loadResultsHistory() {
        const history = Object.assign({}, JSON.parse(localStorage.getItem("history")));

        this.ui.$historyResults.innerHTML = "";
        if (Object.entries(history).length === 0) {
            const $resultsRow = document.createElement("tr");
            $resultsRow.innerHTML =
                '<td class="text-center" colspan="6">No results.<br><a href="#run">Run a speed test</a> now.</td>';
            this.ui.$historyResults.appendChild($resultsRow);

            return;
        }

        Object.entries(history).forEach(([timestamp, results]) => {
            const date = new Date(+timestamp);
            const $resultsRow = document.createElement("tr");
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
            this.ui.$historyResults.appendChild($resultsRow);
        });
    }
}
