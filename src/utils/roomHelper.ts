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

type Position = { x: number, y: number };

export async function findPathBFS(
    start: Position,
    goal: Position,
    blockedPositions: Set<string>
): Promise<boolean> {
    const queue: Position[] = [start];
    const visited: Set<string> = new Set();
    visited.add(`${start.x},${start.y}`);

    const directions = [
        { x: 1, y: 0 },  // Right
        { x: -1, y: 0 }, // Left
        { x: 0, y: 1 },  // Down
        { x: 0, y: -1 }  // Up
    ];

    console.log("Blocked positions:", Array.from(blockedPositions));
    console.log(`Start position: ${start.x},${start.y}, Goal position: ${goal.x},${goal.y}`);

    while (queue.length > 0) {
        const current = queue.shift()!;
        const currentKey = `${current.x},${current.y}`;

        // console.log(`Current position: ${currentKey}`); // Debugging

        // Check if we've reached the goal
        if (currentKey === `${goal.x},${goal.y}`) {
            console.log("Path found to goal!");
            return true;
        }

        // Explore neighbors within boundaries
        for (const dir of directions) {
            const neighbor = { x: current.x + dir.x, y: current.y + dir.y };
            const neighborKey = `${neighbor.x},${neighbor.y}`;

            // Check if neighbor is within bounds and not visited or blocked
            if (
                neighbor.x >= 0 && neighbor.x < 9 &&
                neighbor.y >= 0 && neighbor.y < 23 &&
                !blockedPositions.has(neighborKey) // Check for blockage
            ) {
                // Only mark as visited if not already visited
                console.log(`Checking neighbor: ${neighborKey}`); // Debugging
                if (!visited.has(neighborKey)) {
                    queue.push(neighbor);
                    visited.add(neighborKey); // Mark as visited
                    console.log(`Adding neighbor: ${neighborKey}`); // Debugging
                } else {
                    console.log(`Neighbor ${neighborKey} has already been visited.`);
                }
            } else {
                console.log(`Neighbor ${neighborKey} is blocked or out of bounds.`);
            }
        }
    }

    console.log("No path found between start and goal.");
    return false; // No path found if we exit the loop without reaching the goal
}
