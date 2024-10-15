import { Server } from 'socket.io';
import { chatSocket } from '../controllers/chatSocket';
import { notificationSocket } from '../controllers/notificationSocket';

export const initializeSockets = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('a user connected');

    chatSocket(socket);
    notificationSocket(socket);

    socket.on('disconnect', () => {
      console.log('a user disconnected');
    });
  });
};