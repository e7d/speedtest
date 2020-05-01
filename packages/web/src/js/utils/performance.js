export default class Performance {
  /**
   * Read browser most recent PerformanceEntry matching a given path
   * @param {any} path
   * @returns {PerformanceNavigationTiming}
   */
  static getEntry(scope, path) {
    let performanceEntry = null;

    // TODO: Fix for Firefox and IE 11 as they have partial performance object in scope
    const entries = scope.performance.getEntries();
    entries.reverse().forEach(entry => {
      if (new RegExp(path.replace("?", "\\?")).test(entry.name)) {
        performanceEntry = entry;
      }
    });

    if (entries.length > 120) {
      scope.performance.clearResourceTimings();
    }

    return performanceEntry;
  }
}
