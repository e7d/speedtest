# Speed Test

A self-hosted, lightweight speed test implemented in JavaScript, and based on [Web Workers](https://developer.mozilla.org/docs/Web/API/Web_Workers_API) and [XMLHttpRequest](https://developer.mozilla.org/docs/Web/API/XMLHttpRequest).

- [Speed Test](#speed-test)
  - [Demo](#demo)
  - [Usage](#usage)
    - [Compatibility](#compatibility)
    - [Features](#features)
    - [Requirements](#requirements)
    - [Configuration](#configuration)
      - [Endpoints configuration](#endpoints-configuration)
    - [Docker](#docker)
      - [Run the Speed Test container](#run-the-speed-test-container)
      - [Store the results permanently](#store-the-results-permanently)
      - [Use a custom configuration](#use-a-custom-configuration)
    - [Self-hosted server](#self-hosted-server)
  - [Development](#development)
    - [Prerequisites](#prerequisites)
    - [Issues](#issues)
  - [Support the project](#support-the-project)
  - [License](#license)

## Demo

A demo is available here, running on a Digital Ocean server based on Amsterdam:

- stable: [http://134.209.196.181:8080](http://134.209.196.181:8080)
- develop: [http://134.209.196.181:8081](http://134.209.196.181:8081)

## Usage

### Compatibility

| Chrome | Edge | Firefox | Opera | Safari |
| ------ | ---- | ------- | ----- | ------ |
| 43     | \*   | 48.0    | 12.10 | 6.0    |

### Features

- IP Address (with ISP) detection
- Latency and jitter tests
- Download and upload bandwidth tests

### Requirements

- Some decent server CPU
- Using HTTPS is highly discouraged, adding an heavy packet size and computing overhead
- Using server compression is also discouraged, adding a computing overhead

### Configuration

You can configure the speed test server following your needs. Find below the list of configurable options through the file `config.json` available at the root level of the server.  
The key corresponds to the JSON path where to affect the value. For example, setting the value `2000` for the key `download.delay` corresponds to the following JSON:

```json
{
  "download": {
    "delay": 2000
  }
}
```

List of configurable options:
| Key                  | Description                                                                                                   | Default value    | Possible values                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------- |
| analytics.trackingId | The Google Analytics tracking ID to use on the speed test.                                                    |                  | "UA-XXXXXXXX-Y" or empty.                                  |
| ignoreErrors         | Ignore the errors yielded by upload/download requests. If false, the test will be aborted at the first error. | true             | true or false.                                             |
| endpoints            | The available endpoints list.                                                                                 |                  | See [Endpoints configuration](#Endpoints_configuration) below.                                                 |
| endpoint.xhr         | The endpoint to request for XHR.                                                                              | current location | Any http:// or https:// endpoint exposing this speed test. |
| endpoint.websocket   | The endpoint to request for WebSocket.                                                                        | current location | Any ws:// or wss:// endpoint exposing this speed test.     |
| ip.path              | The path of the IP test on the XHR endpoint.                                                                  | ip               |                                                            |
| latency.path         | The path of the latency test on the WebSocket endpoint.                                                       | ping             |                                                            |
| latency.count        | The count of latency requests to emit during the latency test.                                                | null             | Any positive integer.                                      |
| latency.duration     | The duration in seconds of the latency test.                                                                  | 5                | Any positive integer.                                      |
| latency.gracetime    | The duration in seconds at start of the latency test during which results are ignored. Used for test warm-up. | 1                | Any positive integer.                                      |
| download.path        | The path of the download test on the XHR endpoint.                                                            | download         |                                                            |
| download.streams     | The number of concurrent streams to use during the download test.                                             | 6                | Any positive integer.                                      |
| download.delay       | The delay in milliseconds between the first request of each stream.                                           | 150              | Any positive integer.                                      |
| download.size        | The size in bytes downloaded on each download request.                                                        | 8388608          | Any positive integer.                                      |
| download.minSize     | The minimum size in bytes downloaded on each download request, to avoid excessively small requests.           | 1048576          | Any positive integer.                                      |
| download.maxSize     | The maximum size in bytes downloaded on each download request, to avoid excessively huge requests.            | 104857600        | Any positive integer.                                      |
| download.duration    | The duration in seconds of the download test.                                                                 | 10               | Any positive integer.                                      |
| upload.gracetime     | The duration in seconds at start of the upload test during which results are ignored. Used for test warm-up.  |                  |                                                            |
| result.path          | The path of the save result request on the XHR endpoint.                                                      | save             |                                                            |

#### Endpoints configuration

```JSON
{
  "endpoints": [
    {
      "label": "FR",
      "uri": "http://speedtest-fr.localhost:5080"
    },
    {
      "label": "FR (secured)",
      "uri": "https://speedtest-fr.localhost:5443"
    },
    {
      "label": "NL",
      "uri": "http://speedtest-nl.localhost:5080"
    },
    {
      "label": "UK",
      "uri": "http://speedtest-uk.localhost:5080"
    },
    {
      "label": "US",
      "uri": "http://speedtest-us.localhost:5080"
    }
  ]
}
```

### Docker

[![Docker Pulls](https://img.shields.io/docker/pulls/e7db/speedtest.svg)](https://hub.docker.com/r/e7db/speedtest)
[![Docker Stars](https://img.shields.io/docker/stars/e7db/speedtest.svg)](https://hub.docker.com/r/e7db/speedtest)

#### Run the Speed Test container

```sh
docker run --name speedtest -d -p 80:80 e7db/speedtest
```

#### Store the results permanently

To store results permanently, you need a volume:

```sh
docker volume create speedtest_results
docker run --name speedtest -d -p 80:80 -v speedtest_results:/app/results e7db/speedtest
```

**Note:** Results are never cleaned automatically, used space will grow over time.

#### Use a custom configuration

To use a custom configuration through the `config.json` file, mount it through a read-only volume:

```sh
docker run --name speedtest -d -p 80:80 -v /path/to/config.json:/app/web/config.json:ro e7db/speedtest
```

### Self-hosted server

Having cloned this repository, you can launch the speed test on your server in different flavors.

First, you will want to compile the web UI using [NodeJS](https://nodejs.org/) and NPM.

```sh
cd packages/web
npm ci
npm run dist
```

Then, prepare dependencies and run the server.

```sh
cd packages/server
npm ci --production
node server.js 80 ../web/dist
```

## Development

### Prerequisites

ToDo: list prerequisites

- GraphicsMagick: http://www.graphicsmagick.org/download.html
- GhostScript: https://www.ghostscript.com/download.html
- ImageMagick: https://imagemagick.org/script/download.php
- Install fonts from assets/fonts
- NodeJS + NPM

### Issues

If you encounter a problem with the Speed Test, please check if an [existing issue](https://github.com/e7d/speedtest/issues) adresses it and join the discussion. If not, feel free to create a new issue.

## Support the project

You want to support the project? A speed test requires a server with high bandwidth. With Patreon, Paypal or cryprocurrencies, you can help me cover the fees!

[![Become a Patron on Patreon](https://img.shields.io/badge/sponsor-patreon-orange.svg)](https://www.patreon.com/e7d)  
[![Donate with Paypal](https://img.shields.io/badge/donate-paypal-blue.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=B28JLHA4UNKQC&source=url)  
[![Donate Bitcoin](https://img.shields.io/badge/donate-bitcoin-yellow.svg)](bitcoin:1D4fa6WDVNmKmwRJzTKDohYmHB9UzMsVVL?message=Speed%20%Test%20donation) `1D4fa6WDVNmKmwRJzTKDohYmHB9UzMsVVL`  
[![Donate Ethereum](https://img.shields.io/badge/donate-ethereum-lightgrey.svg)](ethereum:0x57f1afbC888d6954F954B0960524E4aa5Fa188af?message=Speed%20%Test%20donation) `0x57f1afbC888d6954F954B0960524E4aa5Fa188af`

## License

MIT License

Copyright (c) 2017-2019 Michaël "e7d" Ferrand

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
