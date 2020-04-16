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
