import { Socket } from 'socket.io';
import { Worker } from 'worker_threads';
import { checkUserInRoom, getRoom, isPlayer } from "../utils/roomHelper";

export const cameraSocket = (socket: Socket) => {
  socket.on('camera:request', async (frame) => {
    
    const user = await checkUserInRoom(socket);
    if (!user) return socket.emit('error', 'You are not in a room');
    if (!isPlayer(socket)) return socket.emit('error', 'You are not a god');

    const room = await getRoom(user.room);
    const roomCreator = room.creator;

    if (roomCreator !== socket.id) return socket.emit('error', 'You are not the room creator');

    const worker = new Worker('./src/controllers/worker.js', {
      workerData: { frame, roomCode: room.code }
    });

    worker.on('message', (message) => {
      socket.to(message.roomCode).emit('camera:sending', message.frame);
    });

    worker.on('error', (error) => {
      console.error('Worker error:', error);
      socket.emit('error', 'An error occurred while processing the frame');
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
      }
    });
  });
};
