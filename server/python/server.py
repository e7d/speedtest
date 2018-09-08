#!/usr/bin/python
from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
from os import curdir, sep
import sys

PORT = 80
if len(sys.argv) > 1:
    PORT = int(sys.argv[1])
BASEPATH = 'web'
if len(sys.argv) > 2:
    BASEPATH = sys.argv[2]

class httpHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/ip':
            self.wfile.write("ip")
            return

        if self.path == '/':
            self.path = '/index.html'

        try:
            sendReply = False
            if self.path.endswith('.css'):
                mimetype='text/css'
                sendReply = True
            if self.path.endswith('.html'):
                mimetype='text/html'
                sendReply = True
            if self.path.endswith('.js'):
                mimetype='application/javascript'
                sendReply = True

            if sendReply == True:
                f = open(BASEPATH + sep + self.path)
                self.send_response(200)
                self.send_header('Content-type', mimetype)
                self.end_headers()
                self.wfile.write(f.read())
                f.close()
            return

        except IOError:
            self.send_error(404, 'File Not Found: %s' % self.path)

try:
    server = HTTPServer(('', PORT), httpHandler)
    print 'Server listening at http://0.0.0.0:%s' % PORT
    server.serve_forever()

except KeyboardInterrupt:
    print '^C received, shutting down the web server'
    server.socket.close()
