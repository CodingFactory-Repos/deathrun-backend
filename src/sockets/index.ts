import { Server } from 'socket.io';
import { roomSocket } from "../controllers/roomSocket";

export const initializeSockets = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('a user connected');

    roomSocket(socket);

    socket.on('disconnect', () => {
      console.log('a user disconnected');
    });
  });
};