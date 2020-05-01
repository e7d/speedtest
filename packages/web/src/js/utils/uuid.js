export default class Uuid {
  /**
   * Generate a RFC4122 compliant UUID
   * @see http://www.ietf.org/rfc/rfc4122.txt
   * @returns {string}
   */
  static v4() {
    let uuid = "",
      i,
      random;
    for (i = 0; i < 32; i++) {
      random = (Math.random() * 16) | 0;
      if (i == 8 || i == 12 || i == 16 || i == 20) uuid += "-";
      uuid += (i == 12 ? 4 : i == 16 ? (random & 3) | 8 : random).toString(16);
    }
    return uuid;
  }
}
