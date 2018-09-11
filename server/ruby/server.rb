# server.rb
require 'socket'
require 'cgi'

def content_type(path)
  {
    'css' => 'text/css',
    'html' => 'text/html',
    'ico' => 'image/x-icon',
    'js' => 'application/javascript',
    'json' => 'application/json',
  }.fetch(File.extname(path).split('.').last, 'application/octet-stream')
end

def write_response(options = {})
  code = options.key?(:code) ? options[:code] : 200
  status = options.key?(:status) ? options[:status] : 'OK'
  mime_type = options.key?(:mime_type) ? options[:mime_type] : 'text/plain'
  message = options.key?(:message) ? options[:message] : ''
  length = options.key?(:length) ? options[:length] : message.bytesize

  "HTTP/1.1 #{code} #{status}\r\n" \
    "Content-Type: #{mime_type}\r\n" \
    "Content-Length: #{length}\r\n" \
    "Connection: close\r\n" \
    "\r\n" +
    message
end

def get_data(chunks)
  1.upto(chunks) { yield }
end

server = TCPServer.new(ARGV[0] || 80)
loop do
  base_path = ARGV[1] || 'web'
  socket = server.accept
  begin
    request = socket.gets
    request.nil? && throw('Null request')

    request_uri = request.split(' ')[1]
    if request_uri.start_with?('/ip')
      socket.print write_response(message: socket.addr[3])
      next
    end
    if request_uri.start_with?('/ping', '/upload')
      socket.print write_response
      next
    end
    if request_uri.start_with?('/download')
      query = URI.parse(request_uri).query || ''
      params = CGI.parse(query)
      size = params['size'][0] || 20 * 1024**2
      chunk_size = params['chunkSize'][0] || 64 * 1024
      data = ('\x00' * chunk_size)
      chunks = size / chunk_size
      socket.print write_response(
        mime_type: 'application/octet-stream',
        length: size
      )
      get_data(chunks) { socket.print data }
      next
    end

    path = File.join(base_path, CGI.unescape(URI(request_uri).path))
    path = File.join(path, 'index.html') if File.directory?(path)
    STDOUT.puts request
    if File.exist?(path) && !File.directory?(path)
      File.open(path, 'rb') do |file|
        socket.print write_response(
          mime_type: content_type(file),
          length: file.size
        )
        IO.copy_stream(file, socket)
      end
      next
    end

    message = 'File not found'
    socket.print write_response(
      code: 404,
      status: 'Not Found',
      message: message
    )
  rescue StandardError => e
    STDERR.puts e.message
    STDERR.puts e.backtrace.inspect
  ensure
    socket.close
  end
end
