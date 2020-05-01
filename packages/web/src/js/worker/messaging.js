import Scope from "./scope";
import Test from "./test";

export default class Messaging {
  constructor() {
    if (!Messaging.instance) {
      Messaging.instance = this;

      this.scope = new Scope();
      this.test = new Test();
    }

    return Messaging.instance;
  }

  /**
   * Post a message to the main thread
   * @param {*} message
   */
  postMessage(message) {
    this.scope.postMessage(message);
  }

  /**
   * Post a message with the current status
   */
  postStatus() {
    this.postMessage({
      alerts: this.test.alerts,
      status: this.test.status,
      step: this.test.step,
      config: this.test.config,
      result: this.test.result
    });
  }
}
