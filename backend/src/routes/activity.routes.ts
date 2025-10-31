import { Router } from "express";
import { deleteActivity, deleteOldActivities, getActivities, getActivity, getActivityStats, getActivityTimeline, logActivity, logActivityBatch, updateActivity } from "../controllers/activity.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
router.use(authenticateToken);

router.post("/", logActivity);
router.post("/batch", logActivityBatch);

router.get("/", getActivities);
router.get("/timeline", getActivityTimeline);
router.get("/:id", getActivity);

router.put("/:id", updateActivity);
router.delete("/:id", deleteActivity);
router.delete("/cleanup/old", deleteOldActivities);

router.get("/stats/summary", getActivityStats);

export default router;