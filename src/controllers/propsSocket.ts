import {Socket} from 'socket.io';
import {clientDB} from "../utils/databaseHelper";

interface Props {
    x: number,
    y: number
}

export const propsSocket = (socket: Socket) => {
    socket.on('props:send', (props) => {
        sendProps(socket, props);
    });
};

async function sendProps(socket: Socket, props: [string]) {
    const coordinates: Props[] = props.map((prop, index) => {
        const [x, y] = prop.split(',').map(Number);
        return {x, y};
    });

    const room = await clientDB.collection('rooms').findOne({creator: socket.id});

    if (room) {
        await clientDB.collection('rooms').updateOne(
            {creator: socket.id},
            {$set: {props: coordinates}}
        )
    }
}
