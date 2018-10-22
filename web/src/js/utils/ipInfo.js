export default class IpInfo {
    /**
     * Get IP information from "ipinfo.io"
     *
     * @param {String} ip
     */
    static get(ip) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.addEventListener("readystatechange", () => {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if (xhr.status === 200) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        reject(xhr.statusText);
                    }
                }
            });
            xhr.open("GET", `//ipinfo.io/${ip}/json`, true);
            xhr.send(null);
        });
    }
}
