require 'digest/sha1'
require 'json'
require 'socket'

# WebSocketServer class
class WebSocketServer
  def initialize(port, start_server = true)
    @error_callbacks = []
    @message_callbacks = []
    @sockets = []
    @server = TCPServer.new('localhost', port)
    start if start_server
  end

  def get_payload(socket)
    return unless (first_byte = socket.getbyte)

    fin = first_byte & 0b10000000
    opcode = first_byte & 0b00001111

    raise "opcode #{opcode} not supported" unless [1, 8].include? opcode
    raise 'Continuations not supported' unless fin

    second_byte = socket.getbyte
    is_masked = second_byte & 0b10000000
    payload_size = second_byte & 0b01111111

    # Not sure why I have to use ".zero?" instead of "unless is_masked" on the next line
    raise 'All incoming frames should be masked according to the websocket spec' if is_masked.zero?
    raise 'Payloads >= 126 bytes in length not supported' unless payload_size < 126

    mask = 4.times.map { socket.getbyte }
    data = payload_size.times.map { socket.getbyte }
    unmasked_data = data.each_with_index.map { |byte, i| byte ^ mask[i % 4] }
    unmasked_data.pack('C*').force_encoding('utf-8')
  end

  def on(type, &callback)
    @error_callbacks << callback if type == :error
    @message_callbacks << callback if type == :message
  end

  def running?
    @server_running
  end

  def send(message)
    send_response message
  end

  def send_response(message)
    output = [0b10000001, message.size, message]
    @sockets.each { |socket| socket.write output.pack("CCA#{message.size}") }
  end

  def server_loop
    loop do
      next unless running?
      next unless (socket = upgrade_connection)

      @sockets << socket

      Thread.new do
        loop do
          if (data = get_payload(socket))
            @message_callbacks.each { |cb| cb&.call(data) if cb }
          else # TODO: don't kill socket each time no data comes back
            @sockets -= [socket]
            socket = nil
            break
          end
        end
      end

      next
    rescue StandardError => e
      warn e
    end
  end

  def start
    return if running?

    @server_running = true
    Thread.new do
      server_loop
    end
  end

  def stop
    @server_running = false
  end

  def upgrade_connection
    socket = @server.accept

    http_request = ''

    while (line = socket.gets) && (line != "\r\n")
      http_request += line
    end

    if (matches = http_request.match(/^Sec-WebSocket-Key: (\S+)/))
      websocket_key = matches[1]
    else
      socket.close
      raise 'Invalid websocket key'
    end

    response_key = Digest::SHA1.base64digest([
      websocket_key,
      '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
    ].join)

    socket.write <<~HEADER
      HTTP/1.1 101 Switching Protocols
      Upgrade: websocket
      Connection: Upgrade
      Sec-WebSocket-Accept: #{response_key}
      \r
    HEADER

    socket
  end
end

server = WebSocketServer.new(2345)
server.on :message do |message|
  server.send(message)
end

sleep 1 while server.running?
