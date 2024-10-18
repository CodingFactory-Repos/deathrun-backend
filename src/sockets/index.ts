import { roomSocket } from "../controllers/roomSocket";
import {playerSocket} from "../controllers/playerSocket";
import { trapSocket } from "../controllers/trapSocket";
import { Server } from 'socket.io';
import { disconnectedSocket } from "../controllers/disconnectedSocket";
import { propsSocket } from "../controllers/propsSocket";

export const initializeSockets = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('a user connected', socket.id);

    roomSocket(socket);
    playerSocket(socket);
    trapSocket(socket);
    propsSocket(socket);

    disconnectedSocket(socket);
  });
};