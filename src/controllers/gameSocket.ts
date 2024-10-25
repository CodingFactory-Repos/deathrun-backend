import {Socket} from "socket.io";
import {checkUserInRoom} from "../utils/roomHelper";
import {clientDB} from "../utils/databaseHelper";

export const startGame = async (socket: Socket) => {
    const user = await checkUserInRoom(socket);
    if (!user) return socket.emit('error', 'You are not in a room');

    const room = await clientDB.collection('rooms').findOne({ code: user.room });
    if (!room) return socket.emit('error', 'Room not found');
    if (room.players.length < 1) return socket.emit('error', 'Room must have at least 1 player');
    if (room.gods.length < 1) return socket.emit('error', 'Room must have at least 1 god');
    if (room.started) return socket.emit('error', 'Game already started');

    if (room.gods.find((god: { id: string; }) => god.id === socket.id) === undefined) return socket.emit('error', 'You are not a god');

    // Start the game and enterInRoomAt the actual date
    await clientDB.collection('rooms').updateOne({ code: user.room }, { $set: { started: true, enteredInRoomAt: new Date() } });
    const updatedRoom = await clientDB.collection('rooms').findOne({ code: user.room });

    socket.to(user.room).broadcast.emit('rooms:events', updatedRoom);
}

export const endGame = async (socket: Socket) => {
    const user = await checkUserInRoom(socket);
    if (!user) return socket.emit('error', 'You are not in a room');

    const room = await clientDB.collection('rooms').findOne({ code: user.room });
    if (!room) return socket.emit('error', 'Room not found');
    if (!room.started) return socket.emit('error', 'Game not started');

    // Only players can end the game
    if (room.players.find((player: { id: string; }) => player.id === socket.id) === undefined) return socket.emit('error', 'You are not a player');

    // Calculate score
    const currentTime = new Date();
    const enteredInRoomAt = room.enteredInRoomAt as Date;
    const timeElapsed = (currentTime.getTime() - enteredInRoomAt.getTime()) / 1000; // Temps en secondes
    const floors = room.floors || 0; // Accès aux floors dans room

    // Ajustement du score basé sur le temps et le nombre de floors
    const baseMultiplier = 1000; // Multiplieur pour atteindre 6 chiffres
    const score = Math.round(baseMultiplier * floors * (1 / Math.sqrt(timeElapsed))); // Calcul ajusté pour des scores élevés

    // End the game and exit the room
    await clientDB.collection('rooms').updateOne({ code: user.room }, { $set: { started: false, enteredInRoomAt: null, score } });
    const updatedRoom = await clientDB.collection('rooms').findOne({ code: user.room });

    socket.to(user.room).broadcast.emit('rooms:events', updatedRoom);
    socket.emit('rooms:events', updatedRoom);
}