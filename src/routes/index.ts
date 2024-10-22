import { Router } from 'express';
import { homeController } from '../controllers/homeController';
import {roomController} from "../controllers/roomController";

const router = Router();

router.get('/', homeController);
router.get('/room/:code', roomController);

export default router;