import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import routes from './routes';
import { initializeSockets } from './sockets';
import cors from 'cors';

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: process.env.CORS_ORIGIN } });

app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use('/', routes);

initializeSockets(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}.`);
});