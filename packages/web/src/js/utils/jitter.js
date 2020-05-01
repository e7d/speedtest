export default class Jitter {
  /**
   * Compute the jitter from a collection of latencies
   * RFC 1889 (https://www.ietf.org/rfc/rfc1889.txt):
   * J=J+(|D(i-1,i)|-J)/16
   * @param {Array} latencies
   * @returns {number}
   */
  static compute(latencies) {
    return latencies.reduce(
      (jitter, latency, index, latencies) =>
        index === 0 ? 0 : jitter + (Math.abs(latencies[index - 1] - latency) - jitter) / 16,
      0
    );
  }
}
