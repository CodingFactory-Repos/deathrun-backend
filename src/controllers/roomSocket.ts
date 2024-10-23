import {Socket} from 'socket.io';
import {clientDB} from "../utils/databaseHelper";
import {startGame} from "./gameSocket";
import {Webhook} from "discord-webhook-node";
import {getLocalIP} from "../utils/ipHelper";
import os from "os";

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

    socket.on('rooms:start', () => {
        startGame(socket);
    });
};

function createRoom(socket: Socket) {
    // Genere random number code
    const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    clientDB.collection('rooms').insertOne({
        code: roomCode,
        creator: socket.id,
        players: [{id: socket.id}],
        gods: [],
        started: false,
    }).then(() => {
        return clientDB.collection('rooms').findOne({code: roomCode});
    }).then((result) => {
        socket.join(roomCode);
        socket.emit('rooms:create', result);

        const hook = new Webhook(process.env.WEBHOOK_URL || '');
        hook.send(`Room created with code \`${roomCode}\` by \`${os.hostname().split('.')[0]}\` on \`${getLocalIP()}:${process.env.PORT}\` address <@&1298573711015804949>`);
        console.log(os.hostname());
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
    try {
        // Supprimer les salles créées par le joueur qui se déconnecte
        await clientDB.collection('rooms').deleteMany({creator: socket.id});

        // Supprimer le joueur des salles où il est inscrit
        const playerRoom = await clientDB.collection('rooms').findOne({'players.id': socket.id});
        if (playerRoom) {
            await clientDB.collection('rooms').updateMany(
                {_id: playerRoom._id},
                {$pull: {players: {id: socket.id}}} // On supprime l'objet entier où l'id correspond
            ).then(() => {
                return clientDB.collection('rooms').findOne({_id: playerRoom._id});
            }).then((updatedRoom) => {
                socket.to(playerRoom.code).emit('rooms:events', updatedRoom);
            });
        }

        // Supprimer le dieu des salles où il est inscrit
        const godRoom = await clientDB.collection('rooms').findOne({'gods.id': socket.id});
        if (godRoom) {
            await clientDB.collection('rooms').updateMany(
                {_id: godRoom._id},
                {$pull: {gods: {id: socket.id}}} // On supprime l'objet entier où l'id correspond
            ).then(() => {
                return clientDB.collection('rooms').findOne({_id: godRoom._id});
            }).then((updatedRoom) => {
                socket.to(godRoom.code).emit('rooms:events', updatedRoom);
            });
        }
    } catch (error) {
        console.error('Error disconnecting room:', error);
    }
}