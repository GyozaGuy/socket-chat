import connect from 'connect'
import { dirname, join } from 'path'
import serveStatic from 'serve-static'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 8080

connect()
  .use(serveStatic(join(__dirname, 'src')))
  .listen(PORT, () => {
    console.log(`Server running on port ${PORT}!`) // eslint-disable-line
  })

// NOTE: uncomment the following lines if you wish to run the Node.js WebSocket server
// import WebSocketServer from './WebSocketServer'
//
// const wss = new WebSocketServer(2345)
//
// wss.on('message', message => {
//   wss.broadcast(message)
// })
//
// wss.on('error', err => {
//   console.error(err)
// })
