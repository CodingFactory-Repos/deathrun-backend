import {Socket} from 'socket.io';
import {clientDB} from "../utils/databaseHelper";
import {endGame, startGame} from "./gameSocket";
import {MessageBuilder, Webhook} from "discord-webhook-node";
import os from "os";
import {tunnelURL} from "../index";
import {getRoomBySocket, isPlayer, getGodsFromRoom} from "../utils/roomHelper";
import {disconnectUser} from "../utils/userHelper";

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

    socket.on('rooms:death', () => {
        endGame(socket);
    });

    socket.on('rooms:corridor', () => {
        goToNextFloor(socket);
        disablePlayerTracking(socket);
    });

    socket.on('traps:reload', () => {
        enablePlayerTracking(socket);
    });

    socket.on('rooms:delete', () => {
        console.log('delete room');
        deleteRoom(socket);
    });

    socket.on('rooms:death', () => {
        deadUser(socket);
    });
};

async function createRoom(socket: Socket) {
    if (await hasAlreadyRoom(socket)) {
        return;
    }
    
    // Genere random number code
    const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    clientDB.collection('rooms').insertOne({
        code: roomCode,
        creator: socket.id,
        players: [{id: socket.id}],
        gods: [],
        started: false,
        floor: 0,
        bank: 10,
        score: 0,
        enterInRoomAt: new Date()
    }).then(() => {
        return clientDB.collection('rooms').findOne({code: roomCode});
    }).then((result) => {
        socket.join(roomCode);
        socket.emit('rooms:code', result);
        socket.emit('rooms:create', result);

        const hook = new Webhook(process.env.WEBHOOK_URL || '');
        const embed = new MessageBuilder()
            .setTitle('Room created')
            .setAuthor(os.hostname().split('.')[0], "https://img.icons8.com/?size=512&id=122959&format=png")
            .addField('Code', roomCode)
            .addField('Tunnel Address', tunnelURL ?? 'No tunnel address. Please restart the server.')
            .setTimestamp();

        hook.send(embed);
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

        const updateData: any = data.joinAs === 'player'
            ? {$push: {players: {id: socket.id}}}
            : {$push: {gods: {id: socket.id, god: data.godId, spendingLimit: 0, divinityPoints: 0}}};

        await clientDB.collection('rooms').updateOne({code: data.code}, updateData);

        if (data.joinAs === 'god') {
            const updatedRoom: any = await clientDB.collection('rooms').findOne({code: data.code});
            const newSpendingLimit = Math.floor(updatedRoom.bank / updatedRoom.gods.length);
            await clientDB.collection('rooms').updateMany(
                {code: data.code},
                {$set: {'gods.$[].spendingLimit': newSpendingLimit}}
            );
        }

        const updatedRoom = await clientDB.collection('rooms').findOne({code: data.code});
        if (updatedRoom && updatedRoom.creator) {
            socket.join(data.code);

            socket.to(data.code).emit('rooms:events', updatedRoom);
            socket.emit('rooms:join', updatedRoom);
            socket.to(updatedRoom.creator).emit('trapper:join', {player: socket.id});
        }
    });
}

export async function disconnectRoom(socket: Socket) {
    try {
        await clientDB.collection('rooms').deleteMany({creator: socket.id});

        const playerRoom = await clientDB.collection('rooms').findOne({'players.id': socket.id});
        if (playerRoom) {
            await clientDB.collection('rooms').updateMany(
                {_id: playerRoom._id},
                {$pull: {players: {id: socket.id}} as any }
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
                {$pull: {gods: {id: socket.id}} as any } // On supprime l'objet entier où l'id correspond
            ).then(async () => {
                const updatedRoom = await clientDB.collection('rooms').findOne({_id: godRoom._id});
                if (updatedRoom) {
                    const newSpendingLimit = Math.floor(updatedRoom.bank / updatedRoom.gods.length);
                    await clientDB.collection('rooms').updateMany(
                        {_id: godRoom._id},
                        {$set: {'gods.$[].spendingLimit': newSpendingLimit}}
                    );
                    socket.to(godRoom.code).emit('rooms:events', updatedRoom);
                }
            });
        }
    } catch (error) {
        console.error('Error disconnecting room:', error);
    }
}

async function goToNextFloor(socket: Socket) {
    const room = await getRoomBySocket(socket);
    if (!room) return;

    if (!(await isPlayer(socket))) return socket.emit('error', 'You are not a player');

    const {floor, bank} = room;

    // Les gods on une banque en commun. A chaque nouveau étage, on ajoute 2 pieces à la banque.
    const newFloor = floor + 1;
    const newBank = bank + newFloor;

    incrementDivinityPoints(socket, newFloor);

    await clientDB.collection('rooms').updateOne(
        {'players.id': socket.id},
        {$set: {floor: newFloor, bank: newBank}}
    ).then(() => {
        return clientDB.collection('rooms').findOne({'players.id': socket.id});
    }).then(async () => {
        const updatedRoom = await clientDB.collection('rooms').findOne({'players.id': socket.id});
        if (updatedRoom) {
            const equalSpendingLimit = Math.floor(updatedRoom.bank / updatedRoom.gods.length);
            clientDB.collection('rooms').updateMany(
                {'gods.id': {$in: updatedRoom.gods.map((god: any) => god.id)}},
                {$set: {'gods.$[].spendingLimit': equalSpendingLimit}}
            ).then(async () => {;
                const updatedRoom = await clientDB.collection('rooms').findOne({'players.id': socket.id});
                socket.to(room.code).emit('rooms:events', updatedRoom);
            });
        }
    });
}

async function incrementDivinityPoints(socket: Socket, floor: number) {
    const room = await getRoomBySocket(socket);
    if (!room) return;

    if (floor < 9 || (floor - 10) % 3 !== 0) return;

    for (const god of room.gods) {
        if (!god) continue;
        
        const newDivinityPoints = god.divinityPoints + 1;

        try {
            await clientDB.collection('rooms').updateOne(
                { 'gods.id': god.id },
                { $set: { 'gods.$.divinityPoints': newDivinityPoints } }
            );
            
            const updatedRoom = await clientDB.collection('rooms').findOne({ 'gods.id': god.id });
            if (updatedRoom) {
                socket.to(room.code).emit('rooms:events', updatedRoom);
            }
        } catch (error) {
            console.error('Error updating divinity points:', error);
        }
    }
}


async function disablePlayerTracking(socket: Socket) {
    const room = await getRoomBySocket(socket);
    if (!room) return;

    socket.to(room.code).emit('disable:tracking');
}

async function enablePlayerTracking(socket: Socket) {
    const room = await getRoomBySocket(socket);
    if (!room) return;

    socket.to(room.code).emit('enable:tracking');
}

function hasAlreadyRoom(socket: Socket): Promise<boolean> {
    return clientDB.collection('rooms').findOne({creator: socket.id}).then((room) => {
        if (room) {
            return true;
        }
        return false
    });
}

async function deleteRoom(socket: Socket) {
    const gods = await getGodsFromRoom(socket);
    clientDB.collection('rooms').deleteOne({creator: socket.id}).then(() => {
        // Emit to every god in the room the socket
        gods?.forEach((god) => {
            console.log('deleted room socket to ', god);
            socket.to(god).emit('rooms:delete');
        });
        disconnectUser(socket);
    });
}

async function deadUser(socket: Socket) {
    const gods = await getGodsFromRoom(socket);
    gods?.forEach((god) => {
        socket.to(god).emit('user:death');
    });
}