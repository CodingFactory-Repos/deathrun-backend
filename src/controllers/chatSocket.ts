import { Socket } from 'socket.io';

export const chatSocket = (socket: Socket) => {
  socket.on('chat message', (msg) => {
    console.log('chat message: ' + msg);
    socket.broadcast.emit('chat message', "Hello from the server! You said: " + msg);
  });
};