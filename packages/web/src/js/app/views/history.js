import Bytes from "../../utils/bytes";
import DateFormat from "../../utils/dateFormat";
import SemVer from "../../utils/semver";
import { UI } from "../ui";

export default class HistoryView {
  constructor() {
    this.attachEventHandlers();
  }

  /**
   * Attach event handlers to the UI
   */
  attachEventHandlers() {
    UI.$eraseHistoryButton.addEventListener("click", this.eraseHistoryButtonClickHandler.bind(this));
  }

  /**
   * Select the share result link on text input click
   */
  eraseHistoryButtonClickHandler() {
    if (
      Object.entries(this.results).length === 0 ||
      !window.confirm("The results history will be permanently deleted. Are you sure you want to delete it?")
    )
      return;

    localStorage.removeItem("history");
    this.loadResultsHistory();
  }

  /**
   * Load the results history from local storage
   */
  loadResultsHistory() {
    this.results = {};
    this.$points = [];

    this.results = this.filterResults(JSON.parse(localStorage.getItem("history")) || {});

    UI.$resultsHistoryTable.innerHTML = "";
    if (Object.entries(this.results).length === 0) {
      this.printPlaceholder();
      return;
    }

    this.printResults();
  }

  /**
   * Filter out the results belonging previous versions
   * @param {*} results
   */

  filterResults(results) {
    const filteredResults = {};
    Object.entries(results)
      .filter(([_, result]) => SemVer.isCurrentOrNewer(result.version, VERSION, "minor"))
      .forEach(([timestamp, result]) => (filteredResults[timestamp] = result));
    return filteredResults;
  }

  /**
   * Print the placeholder stating that no result is available
   */
  printPlaceholder() {
    UI.$resultsHistoryChart.setAttribute("hidden", "");
    const $resultsRow = document.createElement("tr");
    $resultsRow.innerHTML = '<td class="text-center" colspan="99">No results</td>';
    UI.$resultsHistoryTable.appendChild($resultsRow);
  }

  /**
   * Print the results history to the page
   */
  printResults() {
    this.printTable(this.results);
    this.printGraph(this.results);
  }

  /**
   * Print the results table
   * @param {*} results
   */
  printTable(results) {
    Object.values(results).forEach(result => {
      try {
        const $row = document.createElement("tr");
        $row.innerHTML = this.getHtmlRow(result);
        $row.addEventListener("mouseenter", () => {
          this.toggleCirclesFocus(result.id, "add");
        });
        $row.addEventListener("mouseleave", () => {
          this.toggleCirclesFocus(result.id, "remove");
        });
        UI.$resultsHistoryTable.appendChild($row);
      } finally {
        this.handleShareResultLinks();
      }
    });
  }

  /**
   * Get the HTML row for a result
   * @param {*} result
   */
  getHtmlRow(result) {
    const date = new Date(+result.timestamp);
    return `
      <td>${DateFormat.toISO(date)}</td>
      <td>${result.latency.avg} ms</td>
      <td>${result.jitter} ms</td>
      <td>${(result.download.speed / 1024 ** 2).toFixed(2)} Mbps</td>
      <td>${(result.upload.speed / 1024 ** 2).toFixed(2)} Mbps</td>
      <td>${result.ipInfo.ip}${result.ipInfo.org ? `<br>${result.ipInfo.org}` : ""}</td>
      <td class="text-center">
          <a class="btn btn-link" href="result/${result.id}">
              <i class="icon icon-link2"></i>
          </a>
          <a class="btn btn-link" href="share/${result.id}">
              <i class="icon icon-link"></i>
          </a>
      </td>
    `;
  }

  /**
   * Print the results graph
   * @param {*} results
   */
  printGraph(results) {
    const { linesString, circlesString, textString } = this.getGraphStrings(
      Object.values(results).map(result => {
        return {
          id: result.id,
          download: result.download.speed,
          upload: result.upload.speed
        };
      })
    );
    UI.$resultsHistoryChart.removeAttribute("hidden");
    UI.$resultsHistoryDownloadLine.setAttribute("points", linesString.download);
    UI.$resultsHistoryDownloadPoints.innerHTML = circlesString.download;
    UI.$resultsHistoryUploadLine.setAttribute("points", linesString.upload);
    UI.$resultsHistoryUploadPoints.innerHTML = circlesString.upload;

    // ToDo: Use text strings
  }

  /**
   * Get the strings used to draw the results graph
   * @param {*} results
   * @returns {*}
   */
  getGraphStrings(results) {
    const maxResult = this.getMaxResult(results);
    return results.reduce(
      ({ linesString, circlesString, textString }, result, index) => {
        const interval = 500 / (results.length + 1);
        const [x, yDownload, yUpload] = [
          490 - (interval + index * interval),
          55 - (50 * result.download) / maxResult,
          55 - (50 * result.upload) / maxResult
        ];
        return {
          linesString: this.getLinesString(linesString, x, yDownload, yUpload),
          circlesString: this.getCirclesString(circlesString, x, yDownload, yUpload, result.id),
          textString: this.getTextString(textString, x, yDownload, yUpload, result)
        };
      },
      {
        linesString: { download: "", upload: "" },
        circlesString: { download: "", upload: "" },
        textString: { download: "", upload: "" }
      }
    );
  }

  /**
   * Get the string used to draw the lines
   * @param {*} linesString
   * @param {*} x
   * @param {*} yDownload
   * @param {*} yUpload
   */
  getLinesString(linesString, x, yDownload, yUpload) {
    return {
      download: `${linesString.download} ${x},${yDownload} `,
      upload: `${linesString.upload} ${x},${yUpload} `
    };
  }

  /**
   * Get the string used to draw the cicles
   * @param {*} linesString
   * @param {*} x
   * @param {*} yDownload
   * @param {*} yUpload
   * @param {*} id
   */
  getCirclesString(circlesString, x, yDownload, yUpload, id) {
    return {
      download: `${circlesString.download}<circle result-id="${id}" cx="${x}" cy="${yDownload}" r="3"></circle>`,
      upload: `${circlesString.upload}<circle result-id="${id}" cx="${x}" cy="${yUpload}" r="3"></circle>`
    };
  }

  /**
   * Get the string used to print the text
   * @param {*} linesString
   * @param {*} x
   * @param {*} yDownload
   * @param {*} yUpload
   * @param {*} result
   */
  getTextString(textString, x, yDownload, yUpload, result) {
    return {
      download: `${textString.download}<text result-id="${result.id}" x="${x}" y="${yDownload + 10}">${Bytes.convert(
        result.download
      )}</text>`,
      upload: `${textString.upload}<text result-id="${result.id}" x="${x}" y="${yUpload + 20}">${Bytes.convert(
        result.upload
      )}</text>`
    };
  }

  /**
   * Get the maximum value transfer speed (download or upload) of all results
   * @param {*} results
   * @returns {number}
   */
  getMaxResult(results) {
    return results.reduce((maxResult, result) => {
      return Math.max(maxResult, result.download, result.upload);
    }, 0);
  }

  /**
   * Toggle the focus of the circle corresponding to the hovered table line
   * @param {*} id
   * @param {*} action
   */
  toggleCirclesFocus(id, action = "add") {
    if (!this.$points[id]) {
      this.$points[id] = document.querySelectorAll(`circle[result-id="${id}"]`);
    }
    this.$points[id].forEach($c => $c.classList[action]("focus"));
  }

  /**
   * Add a click handler for each result
   */
  handleShareResultLinks() {
    const $btnLinks = UI.$history.querySelectorAll(".btn-link");
    $btnLinks.forEach($btnLink => {
      $btnLink.addEventListener("click", e => {
        e.preventDefault();
        e.stopImmediatePropagation();

        window.history.pushState({}, "Speed Test - Share", `/${$btnLink.getAttribute("href")}`);
        document.title = "Speed Test - Share";
        window.dispatchEvent(new Event("popstate"));
      });
    });
  }
}
