import { Socket } from 'socket.io';
import { checkUserInRoom } from '../utils/roomHelper';

interface WaitingUser {
    room: string;
    user: string;
    move: string;
}

const moves = ['rock', 'paper', 'scissors'];
const waitingList: WaitingUser[] = [];

export const rockPaperScissorsSocket = (socket: Socket) => {
  socket.on('game:rockpaperscissors', async (move) => {
    const user = await checkUserInRoom(socket);
    if (!user) return socket.emit('error', 'You are not in a room');
    if (!moves.includes(move)) return socket.emit('error', 'Invalid move');

    const room = user.room;
    const waitingUser = waitingList.find(u => u.room === room);

    if (!waitingUser) {
      waitingList.push({ room, user: socket.id, move });
    } else {
      const result = getResult(waitingUser, { room, user: socket.id, move });
      const resultMessage = result.winner ?
        (result.winner === socket.id ? 'win' : 'lose') : 'draw';

      socket.emit('game:rockpaperscissors', { result: resultMessage, move: result.move });
      socket.to(waitingUser.user).emit('game:rockpaperscissors', { result: resultMessage === 'win' ? 'lose' : resultMessage, move: result.move });

      waitingList.splice(waitingList.indexOf(waitingUser), 1); // Remove the waiting user
    }
  });
};

const getResult = (move1: WaitingUser, move2: WaitingUser): { winner: string | null, move: string } => {
  if (move1.move === move2.move) return { winner: null, move: move1.move };
  if ((move1.move === 'rock' && move2.move === 'scissors') ||
      (move1.move === 'paper' && move2.move === 'rock') ||
      (move1.move === 'scissors' && move2.move === 'paper')) {
    return { winner: move1.user, move: move1.move };
  }
  return { winner: move2.user, move: move2.move };
};