import { Socket } from 'socket.io';
import {request} from "node:https";

export const roomSocket = (socket: Socket) => {
  socket.on('rooms:create', (msg: {roomName: string}) => {

  });
};