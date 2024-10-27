import { Socket } from 'socket.io';
import { clientDB } from './databaseHelper';

export const disconnectUser = async (socket: Socket) => {
  socket.disconnect();
}

export const getUser= async (socketID: string, roomCode: any) => {
  const roomSecurity = await clientDB.collection('rooms').findOne({ code: roomCode });

  if (!roomSecurity) {
    throw new Error('Room not found');
  }

  const user = roomSecurity.players.find((player: any) => player.id === socketID) || roomSecurity.gods.find((god: any) => god.id === socketID);

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}