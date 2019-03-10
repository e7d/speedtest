# Speed Test

A self-hosted, lightweight speed test implemented in JavaScript, and based on [Web Workers](https://developer.mozilla.org/docs/Web/API/Web_Workers_API) and [XMLHttpRequest](https://developer.mozilla.org/docs/Web/API/XMLHttpRequest).

- [Compatibility](#compatibility)
- [Features](#featyres)
- [Requirements](#requirements)
- [Usage](#usage)
- [Support the project](#support-the-project)
- [License](#license)

## Compatibility

| Chrome | Edge | Firefox | Opera | Safari |
|--------|------|---------|-------|--------|
| 43     | *    | 48.0    | 12.10 | 6.0    |

## Features

* IP Address (with ISP) detection
* Latency and jitter tests
* Download and upload bandwidth tests

## Requirements

* Some decent server CPU
* Using HTTPS is highly discouraged, adding an heavy packet size and computing overhead
* Using server compression is also discouraged, adding a computing overhead

## Usage

### Docker

[![Docker Pulls](https://img.shields.io/docker/pulls/e7db/speedtest.svg)](https://hub.docker.com/r/e7db/speedtest)
[![Docker Stars](https://img.shields.io/docker/stars/e7db/speedtest.svg)](https://hub.docker.com/r/e7db/speedtest)

```sh
docker run --name speedtest -d -p 80:80 e7db/speedtest
```

To store results permanently, you need a volume:
```sh
docker volume create speedtest_results
docker run --name speedtest -d -p 80:80 -v speedtest_results:/app/results e7db/speedtest
```
Note: Results are never cleaned automatically.

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

## Support the project

You want to support the project? A speed test requires a server with high bandwidth. With Patreon, Paypal or cryprocurrencies, you can help me cover the fees!

[![Become a Patron on Patreon](https://img.shields.io/badge/sponsor-patreon-orange.svg)](https://www.patreon.com/e7d)  
[![Donate with Paypal](https://img.shields.io/badge/donate-paypal-blue.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=B28JLHA4UNKQC&source=url)  
[![Donate Bitcoin](https://img.shields.io/badge/donate-bitcoin-yellow.svg)]() `1D4fa6WDVNmKmwRJzTKDohYmHB9UzMsVVL`  
[![Donate Ethereum](https://img.shields.io/badge/donate-ethereum-lightgrey.svg)]() `0x57f1afbC888d6954F954B0960524E4aa5Fa188af`

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
