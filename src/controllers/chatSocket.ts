import { Socket } from 'socket.io';
import {checkUserInRoom, getRoom, isPlayer} from "../utils/roomHelper";

export const chatSocket = (socket: Socket) => {
  socket.on('room:message', async (msg) => {
    const user = await checkUserInRoom(socket);
    if (!user) return socket.emit('error', 'You are not in a room');
    if (!isPlayer(socket)) return socket.emit('error', 'You are not a god');

    const room = await getRoom(user.room);
    const roomCreator = room.creator;
    const god = room.gods.find((god: any) => god.id === socket.id);

    const message = msg.message;

    socket.to(roomCreator).emit('god:message',[{message, godID: god.god}]);
  });
};