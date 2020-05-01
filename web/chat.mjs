import { createInterface } from 'readline'
import WebSocketClient from './WebSocketClientNode'

setTimeout(() => {
  const readline = createInterface({ input: process.stdin, output: process.stdout })

  readline.question('Please enter a username: ', username => {
    new WebSocketClient('localhost', 2345, async socket => {
      socket.on('message', message => {
        const { data } = JSON.parse(message)
        console.info(`${data}`)
      })

      /* eslint-disable no-constant-condition */
      while (true) {
        const message = await new Promise(resolve => {
          readline.question('', message => {
            resolve(message)
          })
        })

        socket.send(JSON.stringify({ data: `${username}: ${message}`, type: 'message' }))
      }
      /* eslint-enable no-constant-condition */
    })
  })
}, 500)
