import {Socket} from "socket.io";
import {checkUserInRoom, getRoomBySocket, isGod} from "../utils/roomHelper";
import {clientDB} from "../utils/databaseHelper";

export const startGame = async (socket: Socket) => {
    const user = await checkUserInRoom(socket);
    if (!user) return socket.emit('error', 'You are not in a room');

    const room = await clientDB.collection('rooms').findOne({ code: user.room });
    if (!room) return socket.emit('error', 'Room not found');
    if (!isGod(room, socket)) return socket.emit('error', 'You are not the creator of the room');
    if (room.players.length < 1) return socket.emit('error', 'Room must have at least 1 player');
    if (room.gods.length < 1) return socket.emit('error', 'Room must have at least 1 god');
    if (room.started) return socket.emit('error', 'Game already started');

    if (room.gods.find((god: { id: string; }) => god.id === socket.id) === undefined) return socket.emit('error', 'You are not a god');

    // Start the game and enterInRoomAt the actual date
    await clientDB.collection('rooms').updateOne({ code: user.room }, { $set: { started: true, enterInRoomAt: new Date() } });
    const updatedRoom = await clientDB.collection('rooms').findOne({ code: user.room });

    socket.to(room.creator).emit('rooms:start');
    socket.to(user.room).broadcast.emit('rooms:events', updatedRoom);
}

export const endGame = async (socket: Socket) => {
    console.log('endGame');
    const room = await getRoomBySocket(socket);
    if (!room) return socket.emit('error', 'Room not found');
    // if (!room.started) return socket.emit('error', 'Game not started');
    if (room.score > 0) return socket.emit('error', 'Game already ended');

    // Only players can end the game
    if (room.players.find((player: { id: string; }) => player.id === socket.id) === undefined) return socket.emit('error', 'You are not a player');

    // Calculate score
    const currentTime = new Date();
    const enterInRoomAt = room.enterInRoomAt as Date;
    const timeElapsed = (currentTime.getTime() - enterInRoomAt.getTime()) / 1000; // Temps en secondes
    console.log('timeElapsed', timeElapsed);
    const floors = room.floor; // Accès aux floors dans room

    // Ajustement du score basé sur le temps et le nombre de floors
    const baseMultiplier = 1000; // Multiplieur pour atteindre 6 chiffres
    const score = Math.round(baseMultiplier * floors * (1 / Math.sqrt(timeElapsed))); // Calcul ajusté pour des scores élevés
    console.log('score', score);

    // End the game and exit the room
    await clientDB.collection('rooms').updateOne({ code: room.code }, { $set: { started: false, score } });
    const updatedRoom = await clientDB.collection('rooms').findOne({ code: room.code });

    socket.to(room.code).broadcast.emit('rooms:events', updatedRoom);
    socket.emit('rooms:events', updatedRoom);
}