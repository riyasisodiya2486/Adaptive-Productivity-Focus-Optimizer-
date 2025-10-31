import { Router } from "express";
import { getGamificationStats, updateGamification, getBadges } from "../controllers/gamification.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
router.use(authenticateToken);

router.get("/user", getGamificationStats);
router.post("/update", updateGamification);
router.get("/badges", getBadges);

export default router;