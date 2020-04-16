import WebSocketClient from './WebSocketClient.mjs'

customElements.define(
  'socket-chat',
  class extends HTMLElement {
    constructor() {
      super()

      const host = this.getAttribute('host')
      const port = Number(this.getAttribute('port')) || null

      if (!(host && port)) {
        throw new Error('Invalid host and/or port!')
      }

      this.socketClient = new WebSocketClient(host, port)
    }

    connectedCallback() {
      this.innerHTML = `
        <style>
          body {
            background-color: DarkGrey;
            font-family: sans-serif;
          }
          #container, #chatView, #textInput, #sendButton {
            border-radius: 4px;
          }
          #container {
            background-color: SlateGrey;
            box-shadow: 0 2px 4px Black;
            display: grid;
            grid-gap: 10px;
            grid-template-rows: 1fr auto;
            left: 50%;
            padding: 10px;
            position: absolute;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 800px;
          }
          #chatView, #textInput, #sendButton, #nameInput {
            font-size: 1.5em;
          }
          #chatView {
            background-color: White;
            box-shadow: inset 0 2px 4px Black;
            height: 500px;
            overflow-y: auto;
            padding: 10px;
          }
          #controls {
            display: grid;
            grid-gap: 10px;
            grid-template-columns: 1fr auto;
          }
          #textInput, #nameInput {
            border: 0;
            box-shadow: inset 0 2px 4px Black;
            padding: 10px;
          }
        </style>

        <section id="container">
          <div id="chatView"></div>
          <div id="controls">
            <input
              autofocus
              id="textInput"
              maxlength="80"
              placeholder="Type your message here"
              type="text"
            >
            <button id="sendButton" type="button" disabled>Send</button>
          </div>
          <div>
            <input id="nameInput" maxlength="10" placeholder="Username" type="text">
          </div>
        </section>
      `

      const chatView = this.querySelector('#chatView')
      this.textInput = this.querySelector('#textInput')
      const sendButton = this.querySelector('#sendButton')
      const nameInput = this.querySelector('#nameInput')

      this.textInput.addEventListener('keypress', ({ code, target: { value } }) => {
        if (code === 'Enter') {
          this.sendMessage(nameInput.value, value)
        }
      })

      sendButton.addEventListener('click', () => {
        this.sendMessage(nameInput.value, this.textInput.value)
      })

      nameInput.addEventListener('input', ({ target: { value } }) => {
        sendButton.disabled = value === ''
      })

      this.socketClient.on('error', message => {
        console.error(message) // eslint-disable-line no-console
      })

      this.socketClient.on('message', message => {
        if (Notification.permission !== 'granted') {
          Notification.requestPermission()
        } else if (!document.hasFocus()) {
          const notification = new Notification('New message!', { body: message })
          notification.addEventListener('click', () => {
            window.focus()
          })
        }

        chatView.innerHTML += `
          <div>${message}</div>
        `

        chatView.scrollTop = chatView.scrollHeight
      })
    }

    sendMessage(username, message) {
      if (username && message) {
        this.socketClient.send(`${username}: ${message}`)
        this.textInput.value = ''
      }
    }
  }
)
