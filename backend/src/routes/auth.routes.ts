import { Router } from "express";
import { login, register, getProfile, update} from "../controllers/auth.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticateToken, getProfile);
router.post('/profile', authenticateToken, update);

export default router;