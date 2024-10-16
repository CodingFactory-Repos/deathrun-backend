import { Socket } from 'socket.io';
import { clientDB } from "../utils/databaseHelper";

export const disconnectedSocket = (socket: Socket) => {
  socket.on('disconnect', async () => {
    console.log('a user disconnected', socket.id);

    await clientDB.collection('rooms').deleteMany({ creator: socket.id });

    const playerRoom = await clientDB.collection('rooms').findOne({ players: socket.id });
    if (playerRoom) {
      await clientDB.collection('rooms').updateMany(
        { _id: playerRoom._id },
        { $pull: { players: socket.id } }
      );
    }

    const godRoom = await clientDB.collection('rooms').findOne({ gods: socket.id });
    if (godRoom) {
      await clientDB.collection('rooms').updateMany(
        { _id: godRoom._id },
        { $pull: { gods: socket.id } }
      );
    }
  });
};