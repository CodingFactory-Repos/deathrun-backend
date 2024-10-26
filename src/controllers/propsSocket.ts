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
    if (!Array.isArray(props) || props.some(prop => typeof prop !== 'string' || !prop.includes(','))) {
        throw new Error('Format de props invalide');
    }

    const coordinates: Props[] = props.map((prop, index) => {
        const [x, y] = prop.split(',').map(Number);
        return {x, y};
    });

    try {
        const room = await clientDB.collection('rooms').findOne({creator: socket.id});
        if (room) {
            await clientDB.collection('rooms').updateOne(
                {creator: socket.id},
                {$set: {props: coordinates}}
            );

            const updatedRoom = await clientDB.collection('rooms').findOne({creator: socket.id});

            socket.to(updatedRoom?.code).emit('rooms:events', updatedRoom)
        } else {
            console.warn(`Aucune salle trouvée pour le socket ${socket.id}`);
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour des props:', error);
        socket.emit('props:error', { message: 'Une erreur est survenue lors de la mise à jour des props.' });
    }
}
