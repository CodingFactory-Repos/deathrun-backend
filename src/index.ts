import 'dotenv/config';
import express from 'express';
import {createServer} from 'http';
import {Server} from 'socket.io';
import routes from './routes';
import {initializeSockets} from './sockets';
import cors from 'cors';
import {clientDB} from "./utils/databaseHelper";
import axios from "axios";

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
    console.info(`Server running on http://localhost:${PORT}.`);

    checkTunnel();
});

async function checkTunnel() {
    tunnelURL = process.env.TUNNEL_URL || null;

    if (tunnelURL) {
        const data = await axios.get(tunnelURL)
            .then(res => res.data)
            .catch(() => null);

        if (data && data === 'Hello World!') {
            console.info(`Tunnel is working: ${tunnelURL}`);
        } else {
            console.error('Tunnel is not working. Please check your .env url.');
            tunnelURL = null;
        }
    } else {
        console.error('Tunnel URL not found in .env file.');
    }
}

export let tunnelURL: string | null;