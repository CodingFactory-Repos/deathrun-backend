import {Socket} from 'socket.io';
import {clientDB} from "../utils/databaseHelper";

interface PropsCoordinates {
    x: number,
    y: number
}

export const roomSocket = (socket: Socket) => {
    socket.on('rooms:create', () => {
        createRoom(socket);
    });

    socket.on('rooms:join', (msg: { code: string, joinAs: "player" | "god" }) => {
        joinRoom(socket, msg);
    });
};

function createRoom(socket: Socket) {
    const roomCode = Math.random().toString(36).substring(7);
    clientDB.collection('rooms').insertOne({
        code: roomCode,
        creator: socket.id,
        players: [socket.id],
        gods: [],
    }).then(() => {
        return clientDB.collection('rooms').findOne({code: roomCode});
    }).then((result) => {
        socket.join(roomCode);
        socket.emit('rooms:create', result);
    });
}

function joinRoom(socket: Socket, data: { code: string, joinAs: "player" | "god" }) {
    clientDB.collection('rooms').findOne({code: data.code, players: {$ne: socket.id}}).then(async (room) => {
        if (room) {
            // Check if the player is already in the room
            if (!room.players.includes(socket.id) || !room.gods.includes(socket.id)) {
                const pushPlayer = data.joinAs === 'player' ? {$push: {players: socket.id}} : {$push: {gods: socket.id}};

                await clientDB.collection('rooms').updateOne(
                    {code: data.code},
                    pushPlayer as any
                )
            }

            await clientDB.collection('rooms').findOne({code: data.code}).then(async (updatedRoom) => {
                socket.join(data.code);
                socket.emit('rooms:join', updatedRoom);

                socket.to(data.code).emit('rooms:events', updatedRoom);

                const room = await clientDB.collection('rooms').findOne({code: data.code});

                if (room && room.creator) {
                    socket.to(room.creator).emit('trapper:join', {player: socket.id});
                }
            });
        } else {
            socket.emit('rooms:join', {error: 'Room not found'});
        }
    });
}

export async function disconnectRoom(socket: Socket) {
    await clientDB.collection('rooms').deleteMany({creator: socket.id});

    const playerRoom = await clientDB.collection('rooms').findOne({players: socket.id});
    if (playerRoom) {
        await clientDB.collection('rooms').updateMany(
            {_id: playerRoom._id},
            {$pull: {players: socket.id}}
        ).then(() => {
            return clientDB.collection('rooms').findOne({_id: playerRoom._id});
        }).then((updatedRoom) => {
            socket.to(playerRoom.code).emit('rooms:events', updatedRoom);
        });
    }

    const godRoom = await clientDB.collection('rooms').findOne({gods: socket.id});
    if (godRoom) {
        await clientDB.collection('rooms').updateMany(
            {_id: godRoom._id},
            {$pull: {gods: socket.id}}
        ).then(() => {
            return clientDB.collection('rooms').findOne({_id: godRoom._id});
        }).then((updatedRoom) => {
            socket.to(godRoom.code).emit('rooms:events', updatedRoom);
        });
    }
};

function convertToCoordinates(coordinates: [string]): PropsCoordinates[] {
    return coordinates.map((prop: string) => {
        const [x, y] = prop.split(',').map(Number);
        return {x, y};
    });
}