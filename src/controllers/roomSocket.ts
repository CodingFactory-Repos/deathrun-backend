import {Socket} from 'socket.io';
import {clientDB} from "../utils/databaseHelper";

interface PropsCoordinates {
    x: number,
    y: number
}

export const roomSocket = (socket: Socket) => {
    socket.on('rooms:create', (coordinates: [string]) => {
        createRoom(socket, coordinates);
    });

    socket.on('rooms:join', (msg: { code: string, joinAs: "player" | "god" }) => {
        joinRoom(socket, msg);
    });
};

function createRoom(socket: Socket, data: [string]) {
    if (data.length < 1) {
        socket.emit('rooms:create', {error: 'Invalid coordinates'});
        return;
    }

    const propsCoordinates: PropsCoordinates[] = convertToCoordinates(data);

    const roomCode = Math.random().toString(36).substring(7);
    clientDB.collection('rooms').insertOne({
        code: roomCode,
        creator: socket.id,
        players: [{id: socket.id}], // Ajout de l'id du joueur
        gods: [], // Les dieux seront ajoutés plus tard
        props: propsCoordinates
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

                const roleData = data.joinAs === 'player'
                    ? {$push: {players: {id: socket.id}}}
                    : {$push: {gods: {id: socket.id, god: data.godId}}}; // Ajout du rôle god avec l'attribut

                await clientDB.collection('rooms').updateOne(
                    {code: data.code},
                    roleData as any
                );
            }

            await clientDB.collection('rooms').findOne({code: data.code}).then((updatedRoom) => {
                socket.join(data.code);
                socket.emit('rooms:join', updatedRoom);
                socket.to(data.code).emit('rooms:events', updatedRoom);
                console.log(socket.id + ' joined room ' + data.code);
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