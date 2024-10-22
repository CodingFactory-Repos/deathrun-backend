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
        players: [{id: socket.id}],
        gods: [],
    }).then(() => {
        return clientDB.collection('rooms').findOne({code: roomCode});
    }).then((result) => {
        socket.join(roomCode);
        socket.emit('rooms:create', result);
    });
}

function joinRoom(socket: Socket, data: { code: string, joinAs: "player" | "god", godId?: number }) {
    clientDB.collection('rooms').findOne({code: data.code, players: {$ne: {id: socket.id}}}).then(async (room) => {
        if (room) {
            // Check if the player or god is already in the room
            const isPlayer = room.players.some((player: any) => player.id === socket.id);
            const isGod = room.gods.some((god: any) => god.id === socket.id);

            if (!isPlayer && !isGod) {
                if (data.joinAs === 'god' && !data.godId) {
                    socket.emit('rooms:join', {error: 'godId is required'});
                    return;
                }

                // Check if the godId is already in the room
                if (data.joinAs === 'god' && room.gods.some((god: any) => god.god === data.godId)) {
                    socket.emit('rooms:join', {error: 'God already in the room'});
                    return;
                }

                const roleData = data.joinAs === 'player'
                    ? {$push: {players: {id: socket.id}}}
                    : {$push: {gods: {id: socket.id, god: data.godId}}}; // Ajout du rôle god avec l'attribut

                await clientDB.collection('rooms').updateOne(
                    {code: data.code},
                    roleData as any
                );
            }

            await clientDB.collection('rooms').findOne({code: data.code}).then(async (updatedRoom) => {
                if (updatedRoom && updatedRoom.creator) {
                    socket.join(data.code); // Join the room
                    socket.emit('rooms:join', updatedRoom); // Send the room data to the player

                    socket.to(data.code).emit('rooms:events', updatedRoom); // Send the room data to the other players
                    console.log(socket.id + ' joined room ' + data.code);

                    socket.to(updatedRoom.creator).emit('trapper:join', {player: socket.id}); // Send the player id to the creator
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
}

function convertToCoordinates(coordinates: [string]): PropsCoordinates[] {
    return coordinates.map((prop: string) => {
        const [x, y] = prop.split(',').map(Number);
        return {x, y};
    });
}