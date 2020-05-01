import Gauge from "svg-gauge";

import DateFormat from "../utils/dateFormat";
import STEP from "../worker/step";

class UIService {
  constructor() {
    this.storeGlobalSelectors();
    this.storeNavigationSelectors();
    this.storeAlertSelectors();
    this.storeAboutSelectors();
    this.storeSettingsSelectors();
    this.storeHistorySelectors();
    this.storeShareSelectors();
    this.storeSpeedtestSelectors();

    this.detectIE();
    this.printVersion();
  }

  storeGlobalSelectors() {
    this.$html = document.querySelector("html");
    this.$head = document.querySelector("head");
    this.$themeColorMeta = document.querySelector('meta[name="theme-color"]');
    this.$body = document.querySelector("body");
    this.$main = document.querySelector("#main");
  }

  storeNavigationSelectors() {
    this.$titleLink = document.querySelector("h1 a");
    this.$commands = document.querySelector("#commands");
    this.$showAboutButton = this.$commands.querySelector("a#show-about");
    this.$resultsHistoryButton = this.$commands.querySelector("a#results-history");
    this.$showSettingsButton = this.$commands.querySelector("a#show-settings");
  }

  storeAlertSelectors() {
    this.$ieAlert = document.querySelector("#ie-alert");
    this.$unknownResultsAlert = document.querySelector("#unknown-results-alert");
    this.$closeButtons = document.querySelectorAll("button.close");
  }

  storeAboutSelectors() {
    this.$about = document.querySelector("#about");
    this.$version = document.querySelector("#version");
  }

  storeSettingsSelectors() {
    this.$settings = document.querySelector("#settings");
    this.$settingsForm = this.$settings.querySelector("form");
    this.$settingsServerField = this.$settingsForm.querySelector("#serverField");
    this.$settingsServerSelect = this.$settingsServerField.querySelector("select");
    this.$settingsPreset = this.$settingsForm.querySelector("[name=preset]");
    this.$saveConfirmation = this.$settingsForm.querySelector("#save-confirmation");
  }

  storeHistorySelectors() {
    this.$history = document.querySelector("#history");
    this.$resultsHistoryChart = this.$history.querySelector("svg");
    this.$resultsHistoryDownloadLine = this.$resultsHistoryChart.querySelector("g#downloadChart polyline");
    this.$resultsHistoryDownloadPoints = this.$resultsHistoryChart.querySelector("g#downloadChart g.points");
    this.$resultsHistoryUploadLine = this.$resultsHistoryChart.querySelector("g#uploadChart polyline");
    this.$resultsHistoryUploadPoints = this.$resultsHistoryChart.querySelector("g#uploadChart g.points");
    this.$resultsHistoryTable = this.$history.querySelector("table tbody");
    this.$eraseHistoryButton = this.$history.querySelector("#erase-history");
  }

  storeShareSelectors() {
    this.$share = document.querySelector("#share");
    this.$shareResultImagePreview = this.$share.querySelector("#share-result-image-preview");
    this.$shareResultLink = this.$share.querySelector("#share-result-link");
    this.$shareResultLinkCopyButton = this.$share.querySelector("#share-result-link-copy");
    this.$shareResultImage = this.$share.querySelector("#share-result-image");
    this.$shareResultImageCopyButton = this.$share.querySelector("#share-result-image-copy");
    this.$shareResultEmbed = this.$share.querySelector("#share-result-embed");
    this.$shareResultEmbedCopyButton = this.$share.querySelector("#share-result-embed-copy");
    this.$shareResultForum = this.$share.querySelector("#share-result-forum");
    this.$shareResultForumCopyButton = this.$share.querySelector("#share-result-forum-copy");
  }

  storeSpeedtestSelectors() {
    this.$speedtest = document.querySelector("#speedtest");
    this.$shareResultButton = this.$speedtest.querySelector("button#share-result");
    this.$startButton = this.$speedtest.querySelector("button#start");
    this.$stopButton = this.$speedtest.querySelector("button#stop");
    this.$resultEntries = this.$speedtest.querySelectorAll(".result");
    this.$timestamp = this.$speedtest.querySelector("#timestamp");
    this.$ipValue = this.$speedtest.querySelector("#ip .value");
    this.$orgValue = this.$speedtest.querySelector("#ip .org");
    this.$latencyResult = this.$speedtest.querySelector("#latency");
    this.$latencyValue = this.$latencyResult.querySelector(".value");
    this.$jitterResult = this.$speedtest.querySelector("#jitter");
    this.$jitterValue = this.$jitterResult.querySelector(".value");
    this.$downloadResult = this.$speedtest.querySelector("#download");
    this.$downloadValue = this.$downloadResult.querySelector(".value");
    this.$uploadResult = this.$speedtest.querySelector("#upload");
    this.$uploadValue = this.$uploadResult.querySelector(".value");
    this.$gauge = this.$speedtest.querySelector("#gauge");
    this.gauge = Gauge(this.$gauge, {
      max: Math.log(10 * 1024 + 1),
      value: 0,
      showValue: false
    });
    this.$gaugeValue = this.$gauge.querySelector(".value");
    this.$progress = this.$speedtest.querySelector("#progress");
    this.$progressBar = this.$speedtest.querySelector("#progress .progress-bar");
  }

  /**
   * Detects if the current browser is Internet Explorer, based on user-agent
   */
  detectIE() {
    const ua = window.navigator.userAgent;
    if (ua.indexOf("MSIE ") > 0 || ua.indexOf("Trident.") > 0) {
      this.$ieAlert.removeAttribute("hidden");
    }
  }

  /**
   * Print the current version information in the "About" section
   */
  printVersion() {
    this.$version.innerHTML = this.$version.innerHTML.replace("{{VERSION}}", VERSION);
    this.$version.innerHTML = this.$version.innerHTML.replace("{{BUILD_DATE}}", DateFormat.toISO(new Date(BUILD_DATE)));
  }

  /**
   * Hide the alert box warning about a not found result
   */
  dismissUnknownResultsAlert() {
    this.$unknownResultsAlert.setAttribute("hidden", "");
  }

  /**
   * Changes the color theme, light or dark
   * @param {string} theme
   */
  changeTheme(theme = "dark") {
    this.$html.classList[theme === "light" ? "add" : "remove"]("light");

    const [, r, g, b] = /([0-9]+), ?([0-9]+), ?([0-9]+)/.exec(
      window.getComputedStyle(this.$body).getPropertyValue("background-color")
    );
    this.$themeColorMeta.setAttribute("content", this.rgbToHex(+r, +g, +b));
  }

  /**
   * Compute hexadecimal color code from RGB values
   * @param {number} r
   * @param {number} g
   * @param {number} b
   */
  rgbToHex(r = 255, g = 255, b = 255) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /**
   * Changes the current displayed page
   * @param {string} page
   */
  showPage(page) {
    this.page = page;

    this.$about.setAttribute("hidden", "");
    this.$settings.setAttribute("hidden", "");
    this.$history.setAttribute("hidden", "");
    this.$share.setAttribute("hidden", "");
    this.$speedtest.setAttribute("hidden", "");
    this[`$${page}`].removeAttribute("hidden");
  }

  /**
   * Reset the current results
   */
  clearResults() {
    this.$timestamp.innerHTML = "";
    this.$ipValue.innerHTML = "";
    this.$orgValue.innerHTML = "";
    this.$latencyValue.innerHTML = "";
    this.$jitterValue.innerHTML = "";
    this.$downloadValue.innerHTML = "";
    this.$uploadValue.innerHTML = "";
  }

  /**
   * Resets the highlighted step
   */
  resetHiglightStep() {
    this.$resultEntries.forEach(elem => elem.classList.remove("active"));
  }

  /**
   * Highlights the current running step
   * @param {string} step
   */
  highlightStep(step) {
    if (this.previousStep === step) {
      return;
    }
    this.previousStep = step;

    this.resetHiglightStep();
    switch (step) {
    case STEP.LATENCY:
      this.$latencyResult.classList.add("active");
      this.$jitterResult.classList.add("active");
      break;
    case STEP.DOWNLOAD:
      this.$downloadResult.classList.add("active");
      break;
    case STEP.UPLOAD:
      this.$uploadResult.classList.add("active");
      break;
    }
  }

  /**
   * Set a value on the progress bar
   * @param {Number} progress
   * @param {string} step
   */
  setProgressBar(progress, step = "") {
    this.$progress.style.flexDirection = step === STEP.DOWNLOAD ? "row-reverse" : "row";
    this.$progressBar.style.width = progress * 100 + "%";
  }
}

export let UI = new UIService();
