import { createHash } from 'crypto'
import { Socket } from 'net'

export default class {
  constructor(host, port, callback) {
    this.errorCallbacks = []
    this.messageCallbacks = []

    this.socket = new Socket().connect({ host, port }, () => {
      console.info(`WebSocket client connecting to ${host}:${port}...`)
    })

    let upgraded = false

    const randomKeySha1sum = createHash('sha1')
    randomKeySha1sum.update(Math.random().toString())
    const randomKey = randomKeySha1sum.digest('base64')

    const wsGuid = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
    const acceptKeySha1sum = createHash('sha1')
    acceptKeySha1sum.update(`${randomKey}${wsGuid}`)
    const acceptKey = acceptKeySha1sum.digest('base64')

    this.socket.on('data', data => {
      if (upgraded) {
        try {
          const payload = this.getPayload(data)
          this.messageCallbacks.forEach(callback => callback(payload))
        } catch (err) {
          console.error(err)
          this.errorCallbacks.forEach(callback => callback(err))
        }
      } else {
        const matches = data.toString().match(/^Sec-WebSocket-Accept: (\S+)/m)

        if (matches && matches[1] === acceptKey) {
          upgraded = true
          callback(this)
        } else {
          const message = 'Invalid accept key'
          console.error(message)
          this.socket.end(`${message}\r\n`)
        }
      }
    })

    this.socket.write(`
GET / HTTP/1.1
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Key: ${randomKey}
/r
`)
  }

  getPayload(data) {
    const firstByte = data[0]
    const opcode = firstByte & 0b00001111

    if (![1, 8].includes(opcode)) {
      throw `opcode ${opcode} not supported`
    }

    const secondByte = data[1]
    const payloadSize = secondByte & 0b01111111
    const messageData = Array(payloadSize)
      .fill()
      .map((_, i) => data[2 + i])
    const newBuf = Buffer.from(messageData)

    return newBuf.toString('utf8')
  }

  on(type, callback) {
    if (typeof callback === 'function') {
      switch (type) {
        case 'error':
          this.errorCallbacks.push(callback)
          break
        case 'message':
          this.messageCallbacks.push(callback)
      }
    }
  }

  send(message) {
    const mask = Array(4)
      .fill()
      .map(() => Math.round(Math.random() * 999))
    const maskedMessage = Buffer.from(message, 'utf-8').map((byte, i) => byte ^ mask[i % 4])
    const output = Buffer.concat([
      Buffer.from([0b10000001, 128 | message.length, ...mask]),
      maskedMessage
    ])

    this.socket.write(output)
  }
}
