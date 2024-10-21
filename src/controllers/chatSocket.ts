import { Socket } from 'socket.io';
import {checkUserInRoom, isPlayer} from "../utils/roomHelper";

export const chatSocket = (socket: Socket) => {
  socket.on('room:message', async (msg) => {
    // Check if user is in a room
    const user = await checkUserInRoom(socket);
    if (!user) return socket.emit('error', 'You are not in a room');
    if (!isPlayer(socket)) return socket.emit('error', 'You are not a god');

    // Broadcast message to room
    socket.to(user.room).broadcast.emit('room:message', msg);
  });
};