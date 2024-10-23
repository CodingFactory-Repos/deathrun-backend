import { Socket } from 'socket.io';
import { clientDB } from './databaseHelper';

export const checkUserInRoom = async (socket: Socket): Promise<{ room: string, role: 'player' | 'god' } | false> => {
  const playerRoom = await clientDB.collection('rooms').findOne({ players: socket.id });
  if (playerRoom) {
    return { room: playerRoom.code, role: 'player' };
  }

  const godRoom = await clientDB.collection('rooms').findOne({ 'gods.id': socket.id });
  if (godRoom) {
    return { room: godRoom.code, role: 'god' };
  }

  return false;
};

export const isPlayer = async (socket: Socket): Promise<boolean> => {
    const playerRoom = await checkUserInRoom(socket);
    if (playerRoom) return playerRoom.role === 'player';

    return false;
}