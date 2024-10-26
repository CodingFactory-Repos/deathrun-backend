import { Socket } from 'socket.io';
import { clientDB } from './databaseHelper';

export const disconnectUser = async (socket: Socket) => {
  socket.disconnect();
}