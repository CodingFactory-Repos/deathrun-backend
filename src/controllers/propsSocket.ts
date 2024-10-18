import {Socket} from 'socket.io';

interface Props {
    x: number,
    y: number
}

export const propsSocket = (socket: Socket) => {
    socket.on('props:current', (props) => {
        sendProps(socket, props);
    });
};

function sendProps(socket: Socket, props: [string]) {
    const coordinates: Props[] = props.map((prop, index) => {
        const [x, y] = prop.split(',').map(Number);
        return {x, y};
    });

    socket.broadcast.emit('props:received', coordinates);
}

