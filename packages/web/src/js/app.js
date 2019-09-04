import Navigation from "./app/navigation";

/**
 * Speed Test web UI
 *
 * @class WebUI
 */
export default class App {
  /**
   * Create an instance of WebUI
   */
  constructor() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./serviceWorker.js");
    }
    this.navigation = new Navigation();
  }
}
