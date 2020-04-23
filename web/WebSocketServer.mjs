import { createHash } from 'crypto'
import { Server } from 'net'

export default class {
  constructor(port) {
    this.errorCallbacks = []
    this.messageCallbacks = []
    this.sockets = []

    this.server = new Server(socket => {
      console.info('Client connected')
      let upgraded = false

      socket.on('end', () => {
        console.info('Client disconnected')
        this.sockets.splice(this.sockets.indexOf(socket), 1)
      })

      socket.on('data', data => {
        if (upgraded) {
          try {
            const payload = this.getPayload(data)
            this.messageCallbacks.forEach(callback => callback(payload))
          } catch (err) {
            console.error(err)
            this.errorCallbacks.forEach(callback => callback(err))
          }
        } else if (this.upgradeConnection(socket, data)) {
          this.sockets.push(socket)
          upgraded = true
        }
      })
    }).listen(port, () => {
      console.info(`WebSocket server listening on port ${port}`)
    })

    this.server.on('error', err => {
      throw err
    })
  }

  broadcast(message) {
    const output = Buffer.concat([
      Buffer.from([0b10000001, message.length]),
      Buffer.from(message, 'utf-8')
    ])
    this.sockets.forEach(socket => socket.write(output))
  }

  getPayload(data) {
    const firstByte = data.readUInt8()
    const fin = firstByte & 0b10000000
    const opcode = firstByte & 0b00001111

    if (![1, 8].includes(opcode)) {
      throw `opcode ${opcode} not supported`
    }

    if (!fin) {
      throw 'Continuations not supported'
    }

    const secondByte = data.readUInt8(1)
    const isMasked = secondByte & 0b10000000
    const payloadSize = secondByte & 0b01111111

    if (isMasked === 0) {
      throw 'All incoming frames should be masked according to the WebSocket spec'
    }

    if (payloadSize > 125) {
      throw 'Payloads > 125 bytes in length not supported'
    }

    const mask = Array(4)
      .fill()
      .map((_, i) => data.readUInt8(2 + i))
    const maskedData = Array(payloadSize)
      .fill()
      .map((_, i) => data.readUInt8(6 + i))
    const unmaskedData = maskedData.map((byte, i) => byte ^ mask[i % 4])
    const newBuf = Buffer.from(unmaskedData)

    return newBuf.toString('utf8')
  }

  on(type, callback) {
    if (typeof callback === 'function') {
      if (type === 'error') {
        this.errorCallbacks.push(callback)
      } else if (type === 'message') {
        this.messageCallbacks.push(callback)
      }
    }
  }

  upgradeConnection(socket, data) {
    const matches = data.toString().match(/^Sec-WebSocket-Key: (\S+)/m)

    if (matches) {
      const websocketKey = matches[1]
      const sha1sum = createHash('sha1')
      sha1sum.update(`${websocketKey}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      const responseKey = sha1sum.digest('base64')
      socket.write(`
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: ${responseKey}
\r
`)

      return true
    } else {
      const message = 'Invalid WebSocket key'
      console.error(message)
      socket.end(`${message}\r\n`)
    }

    return false
  }
}
