import { roomSocket } from "../controllers/roomSocket";
import {disconnectedSocket} from "../controllers/disconnectedSocket";
import {Server} from "socket.io";

export const initializeSockets = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('a user connected', socket.id);

    roomSocket(socket);

    disconnectedSocket(socket);
    });
};