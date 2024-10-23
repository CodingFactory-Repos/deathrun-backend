import { Socket } from 'socket.io';
import { Trap } from "../interfaces/trap";
import { clientDB } from "../utils/databaseHelper";

function handleError(socket: Socket, message: string, data?: any) {
    console.error(message, data);
    socket.emit('traps:error', { error: message });
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
        traps?.forEach(trap => socket.emit('traps:place', { trap, playerId: socket.id }));
    });
};

/**
 * Vérifie si un objet piège est valide.
 * @param trap - L'objet piège à vérifier
 * @returns true si le piège est valide, false sinon
 */
function isValidTrap(trap: any): trap is Trap {
    const { x, y, trapType } = trap;
    return [x, y].every(coord => typeof coord === 'number') && typeof trapType === 'string';
}

/**
 * Place un piège et diffuse l'information aux autres clients.
 * @param socket - L'instance de Socket.IO
 * @param trap - L'objet piège à placer
 */
async function placeTrap(socket: Socket, trap: Trap) {
    if (!(await checkAvailability(socket, trap))) return;
    const trapData = { trap, playerId: socket.id };
    broadcastTrap(socket, trapData);
}

/**
 * Diffuse les informations du piège aux autres clients.
 * @param socket - L'instance de Socket.IO
 * @param trapData - Les données du piège à diffuser
 */
function broadcastTrap(socket: Socket, trapData: any) {
    socket.broadcast.emit('traps:place', trapData);
    socket.emit('traps:success', { message: 'Piège placé avec succès' });
    console.log("Piège émis à tous les clients:", trapData);
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
    return ![props, traps].some(items => isPositionOccupied(items, trap.x, trap.y, socket)) 
           && await addTrapToRoom(socket, trap);
}

/**
 * Récupère la salle à partir de l'ID du socket.
 * @param socket - L'instance de Socket.IO
 * @returns La salle correspondante ou null
 */
async function getRoom(socket: Socket) {
    const room = await clientDB.collection('rooms').findOne({ $or: [{ gods: socket.id }, { creator: socket.id }] });
    if (!room) handleError(socket, 'Vous n\'êtes pas un dieu');
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
        await clientDB.collection('rooms').updateOne({ gods: socket.id }, { $push: { traps: trap } });
        const room = await getRoom(socket);
        if (room?.traps) socket.emit('traps:list', room.traps);
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
