const https = require("https");
const URL = "https://ipinfo.io";

/**
 * Get IP information form ipinfo.io
 *
 * @param {String} ip The IP to get information about
 * @param {String} token The optional authentication token
 * @returns {Promise<string>}
 */
function ipInfo(ip, token = null) {
  return new Promise((resolve, reject) => {
    const endpoint = `${URL}/${ip}/json${token ? `?token=${token}` : ""}`;
    https.get(endpoint, response => {
      let data = "";
      response.on("error", err => reject(err));
      response.on("data", chunk => (data += chunk));
      response.on("end", () => resolve(JSON.parse(data)));
    }).on('error', err => reject(err));
  });
}
module.exports = ipInfo;
