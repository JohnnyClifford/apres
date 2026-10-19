require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const { createApp } = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB(process.env.MONGODB_URI);
  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN?.split(',') ?? '*',
      methods: ['GET', 'POST'],
    },
  });
  app.set('io', io);

  io.on('connection', (socket) => {
    console.log(`[socket] user connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`[socket] user disconnected: ${socket.id}`);
    });
  });

  server.listen(PORT, () => {
    console.log(`[server] listening on :${PORT}`);
  });
}

start().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});