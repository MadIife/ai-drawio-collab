import { Server } from '@hocuspocus/server'

const PORT = parseInt(process.env.PORT || '1234', 10)

const server = Server.configure({
  name: 'ai-drawio-collab-server',
  port: PORT,

  async onConnect(data) {
    console.log(`User connected: ${data.socketId}`)
  },

  async onDisconnect(data) {
    console.log(`User disconnected: ${data.socketId}`)
  },

  async onStoreDocument(data) {
    console.log(`Document saved: ${data.documentName} (clients: ${data.clientsCount})`)
  },
})

server.listen().then(() => {
  console.log(`Hocuspocus server is running on ws://localhost:${PORT}`)
})