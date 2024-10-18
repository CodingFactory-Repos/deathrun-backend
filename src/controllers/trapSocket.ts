import {Socket} from 'socket.io';

export const trapSocket = (socket: Socket) => {
    socket.on('traps:request', (trap) => {
        console.log("Ouais");
        placeTrap(socket, trap);
    });
};

function placeTrap(socket: Socket, trap: any) {
    console.log(trap);
    if (trap.x === undefined || trap.y === undefined || trap.trapType === undefined) {
        socket.emit('traps:error', {error: 'Invalid trap format'});
        return;
    }

    socket.broadcast.emit('traps:place', {trap: trap});
    console.log("Emitted to all");
}

