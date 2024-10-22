import {Socket} from 'socket.io';
import {clientDB} from "../utils/databaseHelper";

interface PropsCoordinates {
    x: number,
    y: number
}

interface joinRoomData {
    code: string,
    joinAs: "player" | "god",
    godId?: number
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

function joinRoom(socket: Socket, data: joinRoomData) {
    clientDB.collection('rooms').findOne({code: data.code, players: {$ne: {id: socket.id}}}).then(async (room) => {
        if (!room) {
            socket.emit('rooms:join', {error: 'Room not found'});
            return;
        }

        const isPlayer = room.players.some((player: any) => player.id === socket.id);
        const isGod = room.gods.some((god: any) => god.id === socket.id);

        if (isPlayer || isGod) return;

        if (data.joinAs === 'god') {
            if (!data.godId) {
                socket.emit('rooms:join', {error: 'godId is required'});
                return;
            }
            if (room.gods.some((god: any) => god.god === data.godId)) {
                socket.emit('rooms:join', {error: 'God already in the room'});
                return;
            }
        }

        const roleData = data.joinAs === 'player'
            ? {$push: {players: {id: socket.id}}}
            : {$push: {gods: {id: socket.id, god: data.godId}}};

        await clientDB.collection('rooms').updateOne({code: data.code}, roleData);

        const updatedRoom = await clientDB.collection('rooms').findOne({code: data.code});
        if (updatedRoom && updatedRoom.creator) {
            socket.to(data.code).emit('rooms:events', updatedRoom);
            socket.join(data.code);
            socket.emit('rooms:join', updatedRoom);
            socket.to(updatedRoom.creator).emit('trapper:join', {player: socket.id});

            console.log(socket.id + ' joined room ' + data.code);
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