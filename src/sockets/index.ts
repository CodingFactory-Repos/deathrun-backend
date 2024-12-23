import { roomSocket } from "../controllers/roomSocket";
import {playerSocket} from "../controllers/playerSocket";
import { trapSocket } from "../controllers/trapSocket";
import { propsSocket } from "../controllers/propsSocket";
import { Server } from 'socket.io';
import { disconnectedSocket } from "../controllers/disconnectedSocket";
import {rockPaperScissorsSocket} from "../controllers/RockPaperScissorsSocket";
import {chatSocket} from "../controllers/chatSocket";
import { cameraSocket } from "../controllers/cameraSocket";

export const initializeSockets = (io: Server) => {
  io.on('connection', (socket) => {
    console.info('a user connected', socket.id);

    roomSocket(socket);
    playerSocket(socket);
    trapSocket(socket);
    rockPaperScissorsSocket(socket);
    propsSocket(socket);
    chatSocket(socket);
    cameraSocket(socket);


    disconnectedSocket(socket);
  });
};