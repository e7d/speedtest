#!/usr/bin/python
from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
from os import path, sep
from sys import argv
from urlparse import parse_qs, urlparse


PORT = 80
if len(argv) > 1:
    PORT = int(argv[1])
BASEPATH = 'web'
if len(argv) > 2:
    BASEPATH = argv[2]


class httpHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def do_GET(self):
        if self.path.startswith('/download'):
            self.send_response(200)
            self.end_headers()
            size = 8 * 1024 * 1024
            try:
                params = parse_qs(urlparse(self.path).query)
                size = int(params.get('size')[0])
            finally:
                print("Use default size")
            chunkSize = 64 * 1024
            try:
                params = parse_qs(urlparse(self.path).query)
                chunkSize = int(params.get('chunkSize')[0])
            finally:
                print("Use default chunkSize")
            data = bytearray(chunkSize)
            chunks = size / chunkSize
            for _ in range(chunks):
                self.wfile.write(data)
                pass
            return

        if self.path.startswith('/ip'):
            self.send_response(200)
            self.end_headers()
            self.wfile.write(self.client_address[0])
            return

        if self.path.startswith('/ping'):
            self.send_response(200)
            self.end_headers()
            return

        if self.path == '/':
            self.path = '/index.html'

        filePath = BASEPATH + sep + self.path
        if path.isfile(filePath):
            mimetype = 'application/octet-stream'
            if self.path.endswith('.css'):
                mimetype = 'text/css'
            if self.path.endswith('.html'):
                mimetype = 'text/html'
            if self.path.endswith('.js'):
                mimetype = 'application/javascript'
            if self.path.endswith('.json'):
                mimetype = 'application/json'

            f = open(filePath)
            self.send_response(200)
            self.send_header('Content-type', mimetype)
            self.end_headers()
            self.wfile.write(f.read())
            f.close()
            return

        self.send_error(404, 'Not Found: %s' % self.path)

    def do_POST(self):
        if self.path.startswith('/upload'):
            self.send_response(200)
            self.end_headers()
            return

        self.send_error(404, 'Not Found: %s' % self.path)


try:
    server = HTTPServer(('', PORT), httpHandler)
    print 'Server listening at http://0.0.0.0:%s' % PORT
    server.serve_forever()

except KeyboardInterrupt:
    print '^C received, shutting down the web server'
    server.socket.close()
