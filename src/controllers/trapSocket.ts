import { Socket } from 'socket.io';
import { Trap } from "../interfaces/trap";
import { clientDB } from "../utils/databaseHelper";
import {checkUserInRoom, isPlayer, findPathBFS} from "../utils/roomHelper";

function handleError(socket: Socket, message: string, data?: any) {
    console.error(message, data);
    socket.emit('traps:error', {error: message});
}

/**
 * Gère les événements de socket liés aux pièges.
 * @param socket - L'instance de Socket.IO
 */
export const trapSocket = (socket: Socket) => {
    socket.on('traps:request', (trap: Trap) => {
        if (!isValidTrap(trap)) return handleError(socket, 'Format de piège invalide', trap);
        placeTrap(socket, trap);
    });

    socket.on('traps:reload', async () => {
        const traps = await reloadTraps(socket);
        socket.emit('traps:place', {traps, playerId: socket.id});
    });
};

/**
 * Vérifie si un objet piège est valide.
 * @param trap - L'objet piège à vérifier
 * @returns true si le piège est valide, false sinon
 */
function isValidTrap(trap: any): trap is Trap {
    const {x, y, trapType} = trap;
    return [x, y].every(coord => typeof coord === 'number') && typeof trapType === 'string';
}

/**
 * Place un piège et diffuse l'information aux autres clients.
 * @param socket - L'instance de Socket.IO
 * @param trap - L'objet piège à placer
 */
async function placeTrap(socket: Socket, trap: Trap) {
    trap.collided = isTrapCollided(trap);
    if (!(await checkAvailability(socket, trap))) return;
    const trapData = {trap, playerId: socket.id};
    broadcastTrap(socket, trapData);
}

function isTrapCollided(trap: Trap) {
    const trapsCollided = ['crossbow']
    return trapsCollided.some(trapName => trap.trapType.includes(trapName));
}

/**
 * Diffuse les informations du piège aux autres clients.
 * @param socket - L'instance de Socket.IO
 * @param trapData - Les données du piège à diffuser
 */
function broadcastTrap(socket: Socket, trapData: any) {
    socket.broadcast.emit('traps:place', trapData);
    socket.emit('traps:success', {message: 'Piège placé avec succès'});
}

/**
 * Vérifie si un piège peut être placé à une position donnée.
 * @param socket - L'instance de Socket.IO
 * @param trap - L'objet piège à placer
 * @returns true si le piège peut être placé, false sinon
 */
async function checkAvailability(socket: Socket, trap: Trap): Promise<boolean> {
    const room = await getRoom(socket);
    if (!room || !trap) return false;

    const { props, traps } = room;

    const start = { x: 4, y: 0 };
    const exit = { x: 4, y: 22 };

    const neighbors = [];
    // First of all if the trap is collided, we must not be able to place it on the neighbours of the exit and the start
        
    if (trap.collided) {
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                neighbors.push({x: exit.x + i, y: exit.y + j});
                neighbors.push({x: start.x + i, y: start.y + j});
            }
        }
    }

    if (neighbors.some(neighbor => neighbor.x === trap.x && neighbor.y === trap.y)) {
        handleError(socket, 'Impossible de placer un piège sur cet emplacement');
        return false;
    }

    // Collect all occupied positions
    const blockedPositions = new Set<string>();
    if (props) {
        props.forEach((prop: any) => blockedPositions.add(`${prop.x},${prop.y}`));
    }
    if (traps) {
        traps.forEach((existingTrap : any) => {
            if (existingTrap.collided) {
                blockedPositions.add(`${existingTrap.x},${existingTrap.y}`);
            }
        });
    }

    // Temporarily add the new trap position to check if it blocks the path
    trap.collided ? blockedPositions.add(`${trap.x},${trap.y}`) : null;
    

    const isPathClear = await findPathBFS(start, exit, blockedPositions);
    
    if (!isPathClear) {
        handleError(socket, 'Placement du piège bloquerait le chemin entre le départ et la sortie');
        return false;
    }

    // Check if the position is available and add trap to the room if everything is fine
    return ![props, traps].some(items => isPositionOccupied(items, trap.x, trap.y, socket)) 
        && await addTrapToRoom(socket, trap);
}

/**
 * Récupère la salle à partir de l'ID du socket.
 * @param socket - L'instance de Socket.IO
 * @param isGodCheck
 * @returns La salle correspondante ou null
 */
async function getRoom(socket: Socket, isGodCheck: boolean = true) {
    const user = checkUserInRoom(socket);
    if (!user) return handleError(socket, 'Vous n\'êtes pas dans une salle');

    if (!isPlayer(socket) && isGodCheck) return handleError(socket, 'Vous n\'êtes pas un dieu');

    const findQuery = await isPlayer(socket) ? {'players.id': socket.id} : {'gods.id': socket.id};

    const room = await clientDB.collection('rooms').findOne(findQuery);
    if (!room) return handleError(socket, 'Salle non trouvée');

    return room;
}

/**
 * Vérifie si une position est déjà occupée par un objet.
 * @param items - La liste des objets (props ou traps)
 * @param x - La coordonnée X à vérifier
 * @param y - La coordonnée Y à vérifier
 * @returns true si la position est occupée, false sinon
 */
function isPositionOccupied(items: any[], x: number, y: number, socket: Socket): boolean {
    if (items?.some(item => item.x === x && item.y === y)) {
        handleError(socket, 'Impossible de placer un piège sur cet emplacement');
        return true;
    }
    return false;
}

/**
 * Ajoute le piège à la salle dans la base de données.
 * @param socket - L'instance de Socket.IO
 * @param trap - L'objet piège à ajouter
 * @returns true si l'ajout a réussi, false sinon
 */
async function addTrapToRoom(socket: Socket, trap: Trap): Promise<boolean> {
    try {
        const buyTrapSuccess = await buyTrap(socket, trap);
        if (!buyTrapSuccess) return false;

        await clientDB.collection('rooms').updateOne({ 'gods.id': socket.id }, { $push: { traps: trap } as any });
        const updatedRoom = await clientDB.collection('rooms').findOne({ 'gods.id': socket.id });
        const room = await getRoom(socket);
        if (room?.traps) socket.emit('traps:list', room.traps);
        socket.to(updatedRoom?.code).emit('rooms:events', updatedRoom)
        return true;
    } catch (error) {
        handleError(socket, 'Erreur lors de l\'ajout du piège à la salle', error);
        return false;
    }
}

async function reloadTraps(socket: Socket) {
    const room = await getRoom(socket);
    return room?.traps || [];
}

async function buyTrap(socket: Socket, trap: Trap) {
    const room = await getRoom(socket);
    if (!room) return false;

    const {bank, gods} = room;
    const trapPrice = await getTrapPrice(trap.trapType);

    // Get the god's spending limit
    const god = gods.find((god: { id: string; }) => god.id === socket.id);
    if (!god) return handleError(socket, 'Dieu non trouvé');

    if (trapPrice > bank || trapPrice > god.spendingLimit) {
        handleError(socket, 'Fonds insuffisants pour acheter ce piège');
        return false;
    }

    const newBank = bank - trapPrice;
    const newSpendingLimit = god.spendingLimit - trapPrice;

    await clientDB.collection('rooms').updateOne(
        {'gods.id': socket.id},
        {
            $set: {
                bank: newBank,
                'gods.$.spendingLimit': newSpendingLimit
            }
        }
    ).then(() => {
        return clientDB.collection('rooms').findOne({'gods.id': socket.id});
    }).then((updatedRoom) => {
        // Broadcast the updated room to all clients
        socket.to(room.code).emit('rooms:events', updatedRoom);
        socket.emit('rooms:events', updatedRoom);
    });

    return true;
}

async function getTrapPrice(trapType: string): Promise<number> {
    return (await clientDB.collection('traps').findOne({name: trapType}))?.price || 99999;
}