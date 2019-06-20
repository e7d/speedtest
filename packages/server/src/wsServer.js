const server = require("websocket").server;
const Logger = require("./logger");

class WebSocketServer {
  constructor(httpServer) {
    this.logger = new Logger();

    const wsServer = new server({
      httpServer,
      maxReceivedFrameSize: 20 * 1024 ** 2
    });

    wsServer.on("request", request => {
      if (!this.originIsAllowed(request.origin)) {
        request.reject();
        this.logger.warn(`Connection from origin ${request.origin} rejected.`);
        return;
      }
      this.logger.debug(`Connection from origin ${request.origin} accepted.`);

      const connection = request.accept(null, request.origin);
      this.logger.debug(`Peer ${connection.remoteAddress} connected.`);

      connection.on("message", data => this.onMessage(connection, data));
      connection.on("error", error => this.onError(connection, error));
      connection.on("close", (code, desc) =>
        this.onClose(connection, code, desc)
      );
    });

    return wsServer;
  }

  originIsAllowed(origin) {
    return true;
  }

  onMessage(connection, data) {
    {
      if (data.type === "utf8")
        return this.handleUtf8Message(connection, data.utf8Data);
    }
  }

  handleUtf8Message(connection, utf8Data) {
    this.logger.debug(`Received UTF8 Message: ${utf8Data}`);
    let data;
    try {
      data = JSON.parse(utf8Data);
    } catch (e) {
      // unknown message, no handling
      return;
    }

    if (data.action !== "ping") return;
    connection.sendUTF(
      JSON.stringify({
        action: "pong",
        index: data.index
      })
    );
  }

  onError(connection, error) {
    this.logger.debug(
      `Peer ${connection.remoteAddress} had error ${error.name}: ${
        error.description
      }`
    );
  }

  onClose(connection, reasonCode, description) {
    this.logger.debug(
      `Peer ${
        connection.remoteAddress
      } disconnected with code ${reasonCode}: ${description}`
    );
  }
}
module.exports = WebSocketServer;
