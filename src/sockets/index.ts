import { roomSocket } from "../controllers/roomSocket";
import {playerSocket} from "../controllers/playerSocket";
import { trapSocket } from "../controllers/trapSocket";
import { Server } from 'socket.io';
import { disconnectedSocket } from "../controllers/disconnectedSocket";
import {rockPaperScissorsSocket} from "../controllers/RockPaperScissorsSocket";

export const initializeSockets = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('a user connected', socket.id);

    roomSocket(socket);
    playerSocket(socket);
    trapSocket(socket);
    rockPaperScissorsSocket(socket);

    disconnectedSocket(socket);
  });
};