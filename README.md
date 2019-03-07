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

![Docker Pulls](https://img.shields.io/docker/pulls/e7db/speedtest.svg)
![Docker Stars](https://img.shields.io/docker/stars/e7db/speedtest.svg)

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
npm run dist
```

Then, prepare dependencies and run the server.


```sh
cd packages/server
npm install
node server.js 80 ../web/dist
```

### Custom server script

You may also run a server based on your own backend script. You should comply to the following routes, for the web UI to work properly:

| Endpoint    | Method | Arguments           | Expected behavior                                                                              |
|-------------|--------|---------------------|------------------------------------------------------------------------------------------------|
| `/ip`       | GET    |                     | Returns a JSON formatted object with the user IP information (i.e., `{ip: 'xxx'}`)             |
| `/ping`     | GET    |                     | Returns an empty response                                                                      |
| `/upload`   | GET    |                     | Returns an empty response                                                                      |
| `/download` | GET    | `size`, `chunkSize` | Returns binary data as long as `size`, with chunks of `chunkSize`                              |
| `/save`     | POST   |                     | Accepts a JSON payload with the results to save, returns an UUID corresponding to this results |

## Support the project

You want to support the project? A speed test requires a server with high bandwith. With Patreon, or a small paypal donation, you can help me cover the fees!
[Patreon sponsoring](https://www.patreon.com/e7d)
[![Paypal donation](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=B28JLHA4UNKQC&source=url)

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
