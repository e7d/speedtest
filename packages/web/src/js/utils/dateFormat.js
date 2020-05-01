export default class DateFormat {
  /**
   * Format a date object to a universally readable format
   * @param {Date} d
   */
  static toISO(d = new Date()) {
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d
      .getDate()
      .toString()
      .padStart(2, "0")} ${d
      .getHours()
      .toString()
      .padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  }
}
