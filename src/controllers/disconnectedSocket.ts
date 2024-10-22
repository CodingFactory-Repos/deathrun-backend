import { Socket } from 'socket.io';
import {disconnectRoom} from "./roomSocket";

export const disconnectedSocket = (socket: Socket) => {
  socket.on('disconnect', async () => {
    console.log('a user disconnected', socket.id);

    disconnectRoom(socket);
  });
};