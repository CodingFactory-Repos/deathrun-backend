import { Socket } from 'socket.io';

export const playerSocket = (socket: Socket) => {
  socket.on('players:move', (msg) => {
    console.log('players:move' + msg);
    socket.broadcast.emit('players:move', msg);
  });
};