import DateFormat from "../utils/dateFormat";
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
     *
     * @todo: Split data loading and HTML building
     */
    loadResultsHistory() {
        this.results = Object.assign(
            {},
            JSON.parse(localStorage.getItem("history"))
        );

        UI.$resultsHistory.innerHTML = "";
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
        UI.$resultsHistory.appendChild($resultsRow);
    }

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
                    <td>${result.ipInfo.ip}${
                        result.ipInfo.org ? `<br>${result.ipInfo.org}` : ""
                    }</td>
                    <td class="text-center">
                        <a class="go-result btn btn-link" href="result#${
                            result.id
                        }">
                            <i class="icon icon-link2"></i>
                        </a>
                        <a class="go-result btn btn-link" href="share#${result.id}">
                            <i class="icon icon-link"></i>
                        </a>
                    </td>
                `;
                UI.$resultsHistory.appendChild($resultsRow);
            } finally {
                // probably an entry build from an old version
            }
        });
        this.handleShareResultLinks();
    }

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
