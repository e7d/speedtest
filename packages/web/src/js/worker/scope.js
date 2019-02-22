export default class Scope {
  /**
   * @param {DedicatedWorkerGlobalScope} scope
   */
  constructor(scope) {
    if (!Scope.instance) {
      Scope.instance = scope;
    }

    return Scope.instance;
  }
}
