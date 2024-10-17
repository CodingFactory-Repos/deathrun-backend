import { Socket } from 'socket.io';
import {checkUserInRoom, isPlayer} from "../utils/roomHelper";

export const playerSocket = (socket: Socket) => {
  socket.on('players:move', async (positionXYZ) => {
    const user = await checkUserInRoom(socket);
    if (!user) return socket.emit('error', 'You are not in a room');
    if (!await isPlayer(socket)) return socket.emit('error', 'You are not a player');

    const [x, y] = sanitize(positionXYZ).split(',').map(parseFloat);

    socket.to(user.room).broadcast.emit('players:move', { x, y });
  });
};

function sanitize(position: string) {
  return position.replace(/[() ]/g, '');
}