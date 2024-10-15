import { Socket } from 'socket.io';

export const notificationSocket = (socket: Socket) => {
  socket.on('notification', (msg) => {
    console.log('notification: ' + msg);
    socket.broadcast.emit('notifications', msg);
  });
};