# Speed Test

A self-hosted, lightweight speed test implemented in JavaScript, and based on [Web Workers](https://developer.mozilla.org/docs/Web/API/Web_Workers_API) and [XMLHttpRequest](https://developer.mozilla.org/docs/Web/API/XMLHttpRequest).

## Compatibility

| Chrome | Edge | Firefox | IE | Opera | Safari | 
|--------|------|---------|-------------------|-------|--------|
| 43     | *    | 48.0    | 11 | 12.10 | 6.0    |

## Features

* IP Address (with ISP) detection
* Latency and jitter tests
* Download and upload bandwidth tests over 1 Gbps

## Requirements

* Some decent server CPU
* Using HTTPS is highly discouraged, adding an heavy packet size and computing overhead
* Using server compression is also discouraged, adding a computing overhead

## Run

### Docker container from registry

```sh
docker run --name speedtest -d -p 80:80 e7db/speedtest
```

Available versions:
| Server language  | Tags             |
|------------------|------------------|
| Go               | `go`             |
| NodeJS (default) | `node`, `latest` |
| PHP              | `php`            |

### Self-hosted server

Having cloned this repository, you can launch the speed test on your server in different flavors.

First, you will want to compile the web UI using [NodeJS](https://nodejs.org/) and NPM.

```sh
cd web
npm run prod
```

Then, different server technologies are available to run the backend side.

#### Go
```sh
cd server/go
go build -o server server.go
./server 80 ../../web/dist
```

#### NodeJS
```sh
cd server/node
npm install
node server.js 80 ../../web/dist
```

#### PHP
```sh
cd server/php
php -S 0.0.0.0:80 -t ../../web/dist server.php
```

### Custom server script

You may also run a server based on your own backend script. You should comply to the following routes, for the web UI to work properly: 
| Endpoint  | Arguments           | Expected behavior         |
|-----------|---------------------|---------------------------|
| /ip       |                     | Returns the user IP       |
| /ping     |                     | Returns an empty response |
| /upload   |                     | Returns an empty response |
| /download | `size`, `chunkSize` | Returns binary data as long as `size`, with chunks of `chunkSize` |

## License 

MIT License

Copyright (c) 2017-2018 Michaël "e7d" Ferrand

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

*[IE]: Internet Explorer
*[over 1 Gbps]: depending the CPU used on both end of the speed test
