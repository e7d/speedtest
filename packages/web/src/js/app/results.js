import DateFormat from "../utils/dateFormat";
import { UI } from "./ui";

export default class Results {
  /**
   * Load the results from the currect URI
   * @returns {Promise<void>}
   */
  static loadFromUri(showShareButton = true) {
    const id = window.location.pathname.split('/').pop();

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", `/results/${id}.json`, true);
      xhr.addEventListener("load", () => {
        if (xhr.status !== 200) {
          UI.$unknownResultsAlert.removeAttribute("hidden");
          reject();
          return;
        }

        const result = JSON.parse(xhr.response);
        UI.$speedtest.className = "done";
        UI.$timestamp.setAttribute("timestamp", result.timestamp);
        UI.$timestamp.innerHTML = `<a href="/result/${result.id}">${DateFormat.toISO(new Date(result.timestamp))}</a>`;
        UI.$ipValue.innerHTML = result.ipInfo.ip;
        UI.$orgValue.innerHTML = result.ipInfo.org || "";
        UI.$latencyValue.innerHTML = result.latency.avg;
        UI.$jitterValue.innerHTML = result.jitter;
        UI.$downloadValue.innerHTML = (+result.download.speed / (1024 ** 2)).toFixed(2);
        UI.$uploadValue.innerHTML = (+result.upload.speed / (1024 ** 2)).toFixed(2);

        if (showShareButton) UI.$shareResultButton.removeAttribute("hidden", "");

        resolve();
      });
      xhr.send();
    });
  }
}
