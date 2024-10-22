import { Request, Response } from 'express';
import {clientDB} from "../utils/databaseHelper";

interface Room {
    exists: boolean;
    code: string;
    availableGods: number[];
    status: number;
}

export const roomController = async (req: Request, res: Response) => {
    // Check if the room exists
    const room = await clientDB.collection('rooms').findOne({code: req.params.code});

    const toResponse: Room = {
        exists: !!room,
        code: req.params.code,
        availableGods: [],
        status: 404
    };

    if (room) {
        // Get the available gods
        const gods = room.gods.map((god: any) => god.god); // [1, 2, 3, 4, 5]
        const allGods = Array.from({length: 7}, (_, i) => i + 1);
        toResponse.availableGods = allGods.filter(god => !gods.includes(god));
        toResponse.status = 200;
    }

    res.status(toResponse.status).json(toResponse);
};