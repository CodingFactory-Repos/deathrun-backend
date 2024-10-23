import {Socket} from "socket.io";
import {checkUserInRoom} from "../utils/roomHelper";
import {clientDB} from "../utils/databaseHelper";

export const startGame = async (socket: Socket) => {
    const user = await checkUserInRoom(socket);
    if (!user) return socket.emit('error', 'You are not in a room');

    const room = await clientDB.collection('rooms').findOne({ code: user.room });
    if (!room) return socket.emit('error', 'Room not found');
    if (room.creator !== socket.id) return socket.emit('error', 'You are not the creator of the room');
    if (room.players.length < 1) return socket.emit('error', 'Room must have at least 1 player');
    if (room.gods.length < 1) return socket.emit('error', 'Room must have at least 1 god');
    if (room.started) return socket.emit('error', 'Game already started');

    await clientDB.collection('rooms').updateOne({ code: user.room }, { $set: { started: true } });
    const updatedRoom = await clientDB.collection('rooms').findOne({ code: user.room });

    socket.to(user.room).broadcast.emit('rooms:events', updatedRoom);
}