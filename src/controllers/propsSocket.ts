import {Socket} from 'socket.io';

export const propsSocket = (socket: Socket) => {
    socket.on('props:current', (props) => {
        sendProps(socket, props);
    });
};

function sendProps(socket: Socket, props: any) {
    // Change each prop from string to x: y: 
    for (let prop in props) {
        if (props.hasOwnProperty(prop)) {
            let [x, y] = props[prop].split(',').map(parseFloat);
            props[prop] = { x, y };
        }
    }

    socket.broadcast.emit('props:received', props);
}

