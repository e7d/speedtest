export default class Request {
  /**
   * Clear a collection of XHR
   * @param {any} requests
   */
  static clearRequests(requests) {
    if (!Array.isArray(requests) || 0 === requests.length) {
      return;
    }

    requests.forEach((request, index) => {
      if (request instanceof WebSocket) {
        this.clearWebSocket(request);
      }

      if (request instanceof XMLHttpRequest) {
        this.clearXMLHttpRequest(request);
      }

      try {
        request = null;
        delete requests[index];
      } catch (ex) {}
    });
    requests = null;
  }

  /**
   * Clear an ongoing WebSocket
   * @param {WebSocket} socket
   */
  static clearWebSocket(socket) {
    try {
      socket.close();
    } catch (ex) {}

    try {
      socket.removeEventListener("open");
      socket.removeEventListener("message");
      socket.removeEventListener("close");
      socket.removeEventListener("error");
    } catch (ex) {}
  }

  /**
   * Clear an ongoing XHR
   * @param {XMLHttpRequest} xhr
   */
  static clearXMLHttpRequest(xhr) {
    if (xhr.readyState < XMLHttpRequest.DONE) {
      try {
        xhr.abort();
      } catch (ex) {}
    }

    try {
      xhr.removeEventListener("progress");
      xhr.removeEventListener("load");
      xhr.removeEventListener("error");
    } catch (ex) {}
    try {
      xhr.upload.removeEventListener("progress");
      xhr.upload.removeEventListener("load");
      xhr.upload.removeEventListener("error");
    } catch (ex) {}

    xhr = null;
  }
}
