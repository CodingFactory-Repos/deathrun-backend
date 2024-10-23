import 'dotenv/config';
import express from 'express';
import {createServer} from 'http';
import {Server} from 'socket.io';
import routes from './routes';
import {initializeSockets} from './sockets';
import cors from 'cors';
import {clientDB} from "./utils/databaseHelper";
import localtunnel from 'localtunnel';
import os from "os";
import axios from "axios";
import {delay} from "./utils/delayHelper";

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
    const tunnel = await localtunnel({
        port: Number(PORT),
        subdomain: os.hostname().split('.')[0].toLowerCase(),
    })

    if (!tunnel.url.includes(os.hostname().split('.')[0].toLowerCase())) {
        console.error('Tunnel creation failed. Retrying in 5 seconds...');
        await delay(5000);
        return createTunnel(port);
    };

    tunnelURL.url = tunnel.url;

    const password = await axios.get('https://loca.lt/mytunnelpassword').catch(() => {
        console.error('Failed to get tunnel password. Retrying in 5 seconds...');
        return delay(5000).then(() => axios.get('https://loca.lt/mytunnelpassword'));
    });
    tunnelURL.password = password.data;

    console.log(`Tunnel running on ${tunnelURL.url} with password ${tunnelURL.password}`);
}

export let tunnelURL: { url: string, password: string } = {url: '', password: ''};