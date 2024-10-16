import { Server } from 'socket.io';

export const initializeSockets = (io: Server) => {
  const port: number = 11100; // Port number
  const io2: Server = require('socket.io')(); // Socket.IO server instance

  io2.use((socket: any, next: Function) => {
    // Middleware for token authentication
    if (socket.handshake.query.token === "UNITY") {
      next();
    } else {
      next(new Error("Authentication error"));
    }
  });

  io2.on('connection', (socket: any) => {
    if (socket.handshake.query.token === "UNITY") {
      console.log("Unity connected");
    }

    socket.emit('connection', { date: new Date().getTime(), data: "Hello Unity" });

    socket.on('hello', (data: any) => {
      socket.emit('hello', { date: new Date().getTime(), data: data });
    });

    socket.on('playerMovement', (data: Object) => {
      console.log("Player Position is: " + JSON.stringify(data));
      // socket.emit('class', { date: new Date().getTime(), data: data });
    });
  });

  io2.listen(port);
  console.log('listening on *:' + port);
  console.log("Full URL of the io2 is " + io2.httpServer.address()?.address + ":" + io2.httpServer.address()?.port);
};
