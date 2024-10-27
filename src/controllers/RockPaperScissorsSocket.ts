import { Socket } from 'socket.io';
import { checkUserInRoom, getPlayer } from '../utils/roomHelper';
import { clientDB } from '../utils/databaseHelper';
import { getUser } from '../utils/userHelper';

interface WaitingUser {
    room: string;
    user: any;
    move: string;
    socket: Socket;
}

const godDictionary: Record<string, string> = {
  "1": "Greed",
  "2": "Chaos",
  "3": "Gluttony",
  "4": "Envy",
  "5": "Death",
  "6": "Vanity",
  "7": "Sloth"
};

const moves = ['rock', 'paper', 'scissors'];
const waitingList: WaitingUser[] = [];

export const rockPaperScissorsSocket = (socket: Socket) => {
  socket.on('rps:select', async (move) => {
    const user = await checkUserInRoom(socket);
    if (!user) return socket.emit('error', 'You are not in a room');
    if (!moves.includes(move.move)) return socket.emit('error', 'Invalid move');

    const room = user.room;
    const waitingUser = waitingList.find(u => u.room === room);

    if (!waitingUser) {
      waitingList.push({ room, user, move: move.move, socket });
      return;
    }

    const users = await Promise.all([
      getPlayer(waitingUser.room, waitingUser.user.role, waitingUser.socket),
      getPlayer(user.room, user.role, socket)
    ]);

    if (areBothGodsOrPlayers(users)) {
      return socket.emit('error', 'Invalid match: two gods or two players cannot compete.');
    }

    const result = getResult(waitingUser, { room, user: socket.id, move: move.move, socket });
    const winnerName = getWinnerName(result.winner, users);
    
    const loser = result.winner === users[0].id ? users[1].id : users[0].id;

    punishLoser(loser, room);

    const resultMessage = result.winner
      ? `${winnerName} won with ${result.move}`
      : 'You made a draw';

    emitResults([waitingUser.socket, socket], resultMessage, result.move);
    removeWaitingUser(waitingUser);
  });
};

const areBothGodsOrPlayers = (users: any[]) => {
  const bothAreGods = users[0].god && users[1].god;
  const bothArePlayers = !users[0].god && !users[1].god;
  return bothAreGods || bothArePlayers;
};

const getWinnerName = (winner: string | null, users: any[]): string | null => {
  if (!winner) return null;

  const winnerIndex = winner === users[0].id ? 0 : 1;
  return users[winnerIndex].god ? findGodsName(users[winnerIndex].god) : "Player";
};

const emitResults = (sockets: Socket[], message: string, move: string) => {
  sockets.forEach(s => s.emit('rps:results', { result: message, move }));
};

const removeWaitingUser = (waitingUser: WaitingUser) => {
  const index = waitingList.indexOf(waitingUser);
  if (index > -1) waitingList.splice(index, 1);
};

const findGodsName = (godId: string): string => {
  return godDictionary[godId] ?? "Unknown God";
};

const getResult = (
  move1: WaitingUser, 
  move2: WaitingUser
): { winner: string | null, move: string } => {
  const winningMoves = {
    rock: 'scissors',
    paper: 'rock',
    scissors: 'paper'
  };

  if (move1.move === move2.move) {
    return { winner: null, move: move1.move };
  }

  const winner = winningMoves[move1.move] === move2.move ? move1.socket.id : move2.socket.id;
  const winningMove = winner === move1.socket.id ? move1.move : move2.move;

  return { winner, move: winningMove };
};

const punishLoser = async (loser: string, roomCode: string) => {
  let loserUser = await getUser(loser, roomCode);

  if (loserUser.god) {
    await clientDB.collection('rooms').updateOne(
      { code: roomCode, 'gods.id': loser },
      { $inc: { 'gods.$.divinityPoints': -1 } }
    );
  } else {
    const room = await clientDB.collection('rooms').findOne({ code: roomCode });
    const loserSocket = room?.players.find((player: any) => player.id === loser);
    loserSocket.emit('lose:life');
  }
};
