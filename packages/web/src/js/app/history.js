import DateFormat from "../utils/dateFormat";
import SemVer from "../utils/semver";
import { UI } from "./ui";

export default class History {
    constructor() {
        this.results = {};

        this.attachEventHandlers();
    }

    /**
     * Attach event handlers to the UI
     */
    attachEventHandlers() {
        UI.$eraseHistoryButton.addEventListener(
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
     */
    loadResultsHistory() {
        this.results = this.filterResults(
            JSON.parse(localStorage.getItem("history")) || {}
        );

        UI.$resultsHistory.innerHTML = "";
        if (Object.entries(this.results).length === 0) {
            this.printPlaceholder();
            return;
        }

        this.printResults();
    }

    /**
     * Filter out the results belonging previous versions
     *
     * @param {*} results
     */

    filterResults(results) {
        const filteredResults = {};
        Object.entries(results)
            .filter(([_, result]) => SemVer.isCurrentOrNewer(result.version, "0.1.1", "minor"))
            .forEach(
                ([timestamp, result]) => (filteredResults[timestamp] = result)
            );
        return filteredResults;
    }

    /**
     * Print the placeholder stating that no result is available
     */
    printPlaceholder() {
        const $resultsRow = document.createElement("tr");
        $resultsRow.innerHTML =
            '<td class="text-center" colspan="99">No results</td>';
        UI.$resultsHistory.appendChild($resultsRow);
    }

    /**
     * Print the results history to the page
     */
    printResults() {
        let $resultsRow;
        Object.entries(this.results).forEach(([timestamp, result]) => {
            try {
                const date = new Date(+timestamp);
                $resultsRow = document.createElement("tr");
                $resultsRow.innerHTML = `
                    <td>${DateFormat.toISO(date)}</td>
                    <td>${result.latency.avg} ms</td>
                    <td>${result.jitter} ms</td>
                    <td>${(result.download.speed / 1024 ** 2).toFixed(
                        2
                    )} Mbps</td>
                    <td>${(result.upload.speed / 1024 ** 2).toFixed(
                        2
                    )} Mbps</td>
                    <td>${result.ipInfo.ip}${
                    result.ipInfo.org ? `<br>${result.ipInfo.org}` : ""
                }</td>
                    <td class="text-center">
                        <a class="go-result btn btn-link" href="result#${
                            result.id
                        }">
                            <i class="icon icon-link2"></i>
                        </a>
                        <a class="go-result btn btn-link" href="share#${
                            result.id
                        }">
                            <i class="icon icon-link"></i>
                        </a>
                    </td>
                `;
                UI.$resultsHistory.appendChild($resultsRow);
            } finally {
            }
        });
        this.handleShareResultLinks();
    }

    /**
     * Add a click handler for each result
     */
    handleShareResultLinks() {
        const $shareLinks = document.querySelectorAll(".go-result");

        $shareLinks.forEach($shareLink => {
            $shareLink.addEventListener("click", e => {
                e.preventDefault();

                window.history.pushState(
                    {},
                    "Speed Test - Share",
                    `/${$shareLink.getAttribute("href")}`
                );
                document.title = "Speed Test - Share";
                window.dispatchEvent(new Event("popstate"));
            });
        });
    }
}
