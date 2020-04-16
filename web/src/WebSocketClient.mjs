export default class {
  constructor(host, port) {
    this.errorCallbacks = []
    this.messageCallbacks = []

    this.ws = new WebSocket(`ws://${host}:${port}`)

    this.ws.addEventListener('open', () => {
      console.info('Socket opened') // eslint-disable-line no-console

      this.ws.addEventListener('close', () => {
        console.info('Socket closed') // eslint-disable-line no-console
      })

      this.ws.addEventListener('error', error => {
        this.errorCallbacks.forEach(callback => callback(error))
      })

      this.ws.addEventListener('message', ({ data: socketData }) => {
        const { data, type } = JSON.parse(socketData)
        let callbacks = []

        if (type === 'error') {
          callbacks = this.errorCallbacks
        } else if (type === 'message') {
          callbacks = this.messageCallbacks
        }

        callbacks.forEach(callback => callback(data))
      })
    })
  }

  on(type, callback) {
    if (type === 'error') {
      this.errorCallbacks.push(callback)
    } else if (type === 'message') {
      this.messageCallbacks.push(callback)
    }
  }

  send(message) {
    this.ws.send(JSON.stringify({ data: message, type: 'message' }))
  }
}
