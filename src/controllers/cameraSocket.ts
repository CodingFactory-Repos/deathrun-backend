import { Socket } from 'socket.io';
import {checkUserInRoom, getRoom, isPlayer} from "../utils/roomHelper";

export const cameraSocket = (socket: Socket) => {
  socket.on('camera:request', async (frame) => {
    
    const user = await checkUserInRoom(socket);
    if (!user) return socket.emit('error', 'You are not in a room');
    if (!isPlayer(socket)) return socket.emit('error', 'You are not a god');

    const room = await getRoom(user.room);
    const roomCreator = room.creator;

    if (roomCreator !== socket.id) return socket.emit('error', 'You are not the room creator');

    socket.to(room.code).emit('camera:sending', frame);
  });
};