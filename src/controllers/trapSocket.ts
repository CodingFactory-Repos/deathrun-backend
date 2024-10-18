import {Socket} from 'socket.io';
import {Trap} from "../interfaces/trap";

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
        console.log("Demande de piège reçue:", trap);
        if (!isValidTrap(trap)) {
            handleError(socket, 'Format de piège invalide', trap);
            return;
        }
        placeTrap(socket, trap);
    });
};

/**
 * Vérifie si un objet piège est valide.
 * @param trap - L'objet piège à vérifier
 * @returns true si le piège est valide, false sinon
 */
function isValidTrap(trap: any): trap is Trap {
    return typeof trap.x === 'number' &&
        typeof trap.y === 'number' &&
        typeof trap.trapType === 'string';
}

/**
 * Place un piège et diffuse l'information aux autres clients.
 * @param socket - L'instance de Socket.IO
 * @param trap - L'objet piège à placer
 */
function placeTrap(socket: Socket, trap: Trap) {
    const trapData = { trap, playerId: socket.id };
    socket.broadcast.emit('traps:place', trapData);
    socket.emit('traps:success', { message: 'Piège placé avec succès' });
    console.log("Piège émis à tous les clients:", trapData);
}

