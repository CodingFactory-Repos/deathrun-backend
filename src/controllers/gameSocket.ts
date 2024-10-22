import {Socket} from "socket.io";
import {checkUserInRoom} from "../utils/roomHelper";
import {clientDB} from "../utils/databaseHelper";

export const startGame = async (socket: Socket) => {
    // Check if user is the creator of the room
    const user = await checkUserInRoom(socket);
    if (!user) return socket.emit('error', 'You are not in a room');

    // Check if the room have at least 1 player, 1 god and started is false
    let room = await clientDB.collection('rooms').findOne({code: user.room});
    if (!room) return socket.emit('error', 'Room not found');
    if (room.creator !== socket.id) return socket.emit('error', 'You are not the creator of the room');
    if (room.players.length < 1) return socket.emit('error', 'Room must have at least 1 player');
    if (room.gods.length < 1) return socket.emit('error', 'Room must have at least 1 god');

    // Set started to true
    room = await clientDB.collection('rooms').updateOne({code: user.room}, {$set: {started: true}}).then(() => {
        return clientDB.collection('rooms').findOne({code: user.room});
    });

    // Start game
    socket.to(user.room).broadcast.emit('rooms:events', room);
}