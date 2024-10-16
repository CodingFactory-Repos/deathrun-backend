import { Server } from 'socket.io';

export const initializeSockets = (io: Server) => {

  const port = 11100;
  const io2 = require('socket.io')();

  io2.use((socket, next) => {
    if (socket.handshake.query.token === "UNITY") {
        next();
    } else {
        next(new Error("Authentication error"));
    }
  });

  
  io2.on('connection', socket => {
    // Whatever you're receiving from Unity just print it
    if (socket.handshake.query.token === "UNITY") {
      console.log("Unity connected");
    }
    socket.emit('connection', {date: new Date().getTime(), data: "Hello Unity"})
  
    socket.on('hello', (data) => {
      socket.emit('hello', {date: new Date().getTime(), data: data});
    });
  
    socket.on('playerMovement', (data: Object) => {
      console.log("Player Position is: " + data);
      
      // socket.emit('class', {date: new Date().getTime(), data: data});
    });
  });
  
  io2.listen(port);
  console.log('listening on *:' + port);
  console.log("Full URL of the io2 is " + io2.httpServer.address().address + ":" + io2.httpServer.address().port);
};