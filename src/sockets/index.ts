import { roomSocket } from "../controllers/roomSocket";
import {playerSocket} from "../controllers/playerSocket";
import { Server } from 'socket.io';
import { disconnectedSocket } from "../controllers/disconnectedSocket";

export const initializeSockets = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('a user connected', socket.id);

    roomSocket(socket);
    playerSocket(socket);

    disconnectedSocket(socket);
  });
};