import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { getAnalyticsOverview, getAppUsage, getDistractions, getFocusTrends, getReport } from "../controllers/analytics.controller";

const router = Router();
router.use(authenticateToken);

router.get("/overview", getAnalyticsOverview);
router.get("/focus-trends", getFocusTrends);
router.get("/apps", getAppUsage);
router.get("/distractions", getDistractions);

router.get("/reports/:range", getReport);

export default router;