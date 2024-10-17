import {Socket} from 'socket.io';
import {clientDB} from "../utils/databaseHelper";

export const roomSocket = (socket: Socket) => {
    socket.on('rooms:create', (msg) => {
        createRoom(socket);
    });

    socket.on('rooms:join', (msg) => {
        joinRoom(socket, msg);
    });
};

function createRoom(socket: Socket) {
    const roomCode = Math.random().toString(36).substring(7);
    clientDB.collection('rooms').insertOne({
        code: roomCode,
        creator: socket.id,
        players: [socket.id],
        gods: []
    }).then(() => {
        return clientDB.collection('rooms').findOne({code: roomCode});
    }).then((result) => {
        socket.join(roomCode);
        socket.emit('rooms:create', result);

        lisenForRoomEvents(socket);
    });
}

function joinRoom(socket: Socket, data: { code: string, joinAs: "player" | "god" }) {
    console.log('rooms:join', socket.id, data);
    // Check if room exists and if player not already in room
    clientDB.collection('rooms').findOne({code: data.code, players: {$ne: socket.id}}).then((room) => {
        if (room) {
            const pushPlayer = data.joinAs === 'player' ? {$push: {players: socket.id}} : {$push: {gods: socket.id}};

            clientDB.collection('rooms').updateOne(
                {code: data.code},
                pushPlayer as any
            ).then(() => {
                return clientDB.collection('rooms').findOne({code: data.code});
            }).then((updatedRoom) => {
                socket.join(data.code);
                socket.emit('rooms:join', updatedRoom);

                socket.to(data.code).emit('rooms:events', updatedRoom);

                lisenForRoomEvents(socket);
            });
        } else {
            socket.emit('rooms:join', {error: 'Room not found or you are already in the room'});
        }
    });
}

function lisenForRoomEvents(socket: Socket) {
    socket.on('rooms:events', (msg: {code: string, creator: string, players: string[], gods: string[]}) => {
        console.log('rooms:events', msg);
    });
}