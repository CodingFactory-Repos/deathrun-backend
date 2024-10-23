import 'dotenv/config';
import express from 'express';
import {createServer} from 'http';
import {Server} from 'socket.io';
import routes from './routes';
import {initializeSockets} from './sockets';
import cors from 'cors';
import {clientDB} from "./utils/databaseHelper";
import ngrok from '@ngrok/ngrok';

const app = express();
const server = createServer(app);
const io = new Server(server, {cors: {origin: process.env.CORS_ORIGIN}});

// Clear all rooms (but keep room with "test" code) on server restart
clientDB.collection('rooms').deleteMany({code: {$ne: 'test'}});

app.use(express.json());
app.use(cors({origin: process.env.CORS_ORIGIN}));
app.use('/', routes);

initializeSockets(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}.`);

    createTunnel(Number(PORT));
});

async function createTunnel(port: number) {
    tunnelURL = (await ngrok.connect({addr: port, authtoken_from_env: true, domain: process.env.NGROK_DOMAIN})).url();
    console.log(`Tunnel created at ${tunnelURL}`);
}

export let tunnelURL: string | null;