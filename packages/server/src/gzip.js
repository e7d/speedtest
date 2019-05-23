const zlib = require("zlib");

/**
 * Enable GZip compression for an HTTP exchange
 *
 * @param {Request} request
 * @param {Response} response
 * @param {Buffer} data
 */
function gzip(request, response) {
  if (!(request.headers["accept-encoding"] || "").includes("gzip")) return;

  const { writeHead, write, end } = response;
  let myStatusCode, myHeaders;

  response.writeHead = (statusCode, headers) => {
    myStatusCode = statusCode;
    myHeaders = headers;
  };
  response.write = (buffer, dataType) => {
    const compressedBuffer = zlib.gzipSync(buffer);
    writeHead.call(response, myStatusCode, {
      ...myHeaders,
      "Content-Encoding": "gzip",
      "Content-Length": compressedBuffer.length
    });
    write.call(response, compressedBuffer, dataType);
    end.call(response);
  };
}

module.exports = gzip;
