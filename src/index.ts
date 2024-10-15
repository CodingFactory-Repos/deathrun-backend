import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { initializeSockets } from './sockets';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

initializeSockets(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Socket-io server running on port ${PORT}.`);
});