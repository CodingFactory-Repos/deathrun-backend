import { Socket } from 'socket.io';

export const playerSocket = (socket: Socket) => {
  socket.on('players:move', (positionXYZ) => {
    const positionSanitized = sanitize(positionXYZ);
    const position = positionSanitized.split(',');
    
    const positionXY = {
      x: parseFloat(position[0]),
      y: parseFloat(position[1]),
    };
    socket.broadcast.emit('players:move', positionXY);
  });
};

function sanitize(position: string) {
  const sanitizedPosition = position.replace(/[() ]/g, '');
  return sanitizedPosition
}