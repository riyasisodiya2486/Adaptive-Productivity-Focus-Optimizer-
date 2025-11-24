import {Router} from "express";
import { getActiveSessionRecommendation, getRecommendationHistory, postRecommendationFeedback } from "../controllers/recommendation.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
router.use(authenticateToken)

router.get("/active", getActiveSessionRecommendation);
router.get("/feedback", postRecommendationFeedback);
router.get("/history", getRecommendationHistory)

export default router;