require('dotenv').config();
const http = require('http');
const { createApp } = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB(process.env.MONGODB_URI);
  const app = createApp();
  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log(`[server] listening on :${PORT}`);
  });
}

start().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});