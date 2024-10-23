import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import routes from './routes';
import { initializeSockets } from './sockets';
import cors from 'cors';
import {clientDB} from "./utils/databaseHelper";
import localtunnel from 'localtunnel';
import os from "os";

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: process.env.CORS_ORIGIN } });

// Clear all rooms (but keep room with "test" code) on server restart
clientDB.collection('rooms').deleteMany({code: {$ne: 'test'}});

app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use('/', routes);

initializeSockets(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}.`);

  const tunnel = await localtunnel({
    port: Number(PORT),
    subdomain: os.hostname().split('.')[0].toLowerCase(),
  })

  ngrokUrl = tunnel.url;
  console.log(`Tunnel running on ${ngrokUrl}`);
});

export let ngrokUrl: string;