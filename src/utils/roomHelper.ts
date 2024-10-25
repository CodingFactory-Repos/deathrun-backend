import { Socket } from 'socket.io';
import { clientDB } from './databaseHelper';

export const checkUserInRoom = async (socket: Socket): Promise<{ room: string, role: 'player' | 'god' } | false> => {
  const playerRoom = await clientDB.collection('rooms').findOne({ 'players.id': socket.id });
  if (playerRoom) {
    return { room: playerRoom.code, role: 'player' };
  }

  const godRoom = await clientDB.collection('rooms').findOne({ 'gods.id': socket.id });
  if (godRoom) {
    return { room: godRoom.code, role: 'god' };
  }

  return false;
};

export const getPlayer = async (code: string, role: string, socket: Socket | null): Promise<any | null> => {
  if (!socket) {
    console.error("Socket is undefined or null");
    return null;
  }

  const socketToCheck = socket.id ? socket.id : socket;
  console.log(`Socket: ${socketToCheck}, Code: ${code}, Role: ${role}`);

  try {
    if (role === 'god') {
      console.log("User is a god");
      const room = await clientDB.collection('rooms').findOne({ code, 'gods.id': socketToCheck });

      if (room && room.gods) {
        return room.gods.find((g: any) => g.id === socketToCheck) || null;
      }
    } else if (role === 'player') {
      const room = await clientDB.collection('rooms').findOne({ code, 'players.id': socketToCheck });

      if (room && room.players) {
        return room.players.find((p: any) => p.id === socketToCheck) || null;
      }
    }
  } catch (error) {
    console.error("Error fetching player:", error);
    return null;
  }

  return null;
};

export const getRoom = async (code: string): Promise<any | null> => {
  const room = await clientDB.collection('rooms').findOne({ code: code });

  if (room) {
    return room;
  }

  return null;
};

export const isPlayer = async (socket: Socket): Promise<boolean> => {
    const playerRoom = await checkUserInRoom(socket);
    if (playerRoom) return playerRoom.role === 'player';

    return false;
}

export const isGod = async (room: any, socket: Socket): Promise<boolean> => {
  const updatedRoom = await getRoom(room.code);
  return updatedRoom.gods.some((god: any) => god.id === socket.id);
}