require 'digest/sha1'
require 'socket'

# WebSocketClient class
class WebSocketClient
  def initialize(host, port, start_client = true)
    start(host, port) if start_client
  end

  def get_payload
    return unless (first_byte = @socket.getbyte)

    opcode = first_byte & 0b00001111

    raise "opcode #{opcode} not supported" unless [1, 8].include? opcode

    second_byte = @socket.getbyte
    payload_size = second_byte & 0b01111111

    data = payload_size.times.map { @socket.getbyte }

    data.pack('C*').force_encoding('utf-8')
  end

  def on(type, &callback)
    @message_callback = callback if type == :message
  end

  def running?
    @client_running
  end

  def send(message)
    send_message message if @socket
  end

  def send_message(message)
    mask = 4.times.map { (rand * 999).to_i }
    masked_message = message.bytes.each_with_index.map { |byte, i| byte ^ mask[i % 4] }
    output = [0b10000001, 128 | message.size].concat(mask).concat(masked_message)
    @socket.write(output.pack('C*'))
  end

  def start(host, port)
    @client_running = true
    @socket = TCPSocket.new(host, port)

    return unless (@socket = upgrade_connection)

    Thread.new do
      loop do
        raise(IOError, 'Connection closed') unless (message = get_payload)

        parsed_message = JSON.parse(message)
        data, type = parsed_message.values_at('data', 'type')

        @message_callback&.call data if @message_callback && type == 'message'
      rescue IOError
        @client_running = false
      rescue StandardError => e
        warn e
      end
    end
  end

  def stop
    @client_running = false
    @socket = nil
  end

  def upgrade_connection
    random_key = Digest::SHA1.base64digest(rand.to_s)

    @socket.write <<~HEADER
      GET / HTTP/1.1
      Connection: Upgrade
      Upgrade: websocket
      Sec-WebSocket-Key: #{random_key}
      \r
    HEADER

    http_response = ''

    accept_key = Digest::SHA1.base64digest("#{random_key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11")

    while (line = @socket.gets) && line != "\r\n"
      http_response += line
    end

    if (matches = http_response.match(/^Sec-WebSocket-Key: (\S+)/))
      raise 'Invalid accept key' unless matches[1] == accept_key
    end

    @socket
  end
end
