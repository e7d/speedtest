export default class Request {
    /**
     * Clear a collection of XHR
     *
     * @param {any} requests
     * @returns {Promise}
     */
    static clearRequests(requests) {
        if (!Array.isArray(requests) || 0 === requests.length) {
            return;
        }

        requests.forEach((request, index) => {
            this.clearXMLHttpRequest(request);

            try {
                request = null;
                delete requests[index];
            } catch (ex) {}
        });
        requests = null;
    }

    /**
     * Clear an ongoing XHR
     *
     * @param {XMLHttpRequest} xhr
     */
    static clearXMLHttpRequest(xhr) {
        try {
            xhr.abort();
        } catch (ex) {}

        try {
            xhr.onprogress = null;
            xhr.onload = null;
            xhr.onerror = null;
        } catch (ex) {}
        try {
            xhr.upload.onprogress = null;
            xhr.upload.onload = null;
            xhr.upload.onerror = null;
        } catch (ex) {}
    }
}
