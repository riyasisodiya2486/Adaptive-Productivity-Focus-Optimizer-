import { Router } from "express";
import { 
    getGamificationStats, 
    updateGamification, 
    getBadges,
    getAchievements,
    getChallenges,
    getLeaderboard,
    getUserRank,
    getMilestones,
    updateGamificationPreferences
} from "../controllers/gamification.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
router.use(authenticateToken);

// Main endpoints
router.get("/user", getGamificationStats);
router.post("/update", updateGamification);

// Badges and achievements
router.get("/badges", getBadges);
router.get("/achievements", getAchievements);

// Challenges
router.get("/challenges", getChallenges);

// Leaderboard
router.get("/leaderboard", getLeaderboard);
router.get("/rank", getUserRank);

// Milestones
router.get("/milestones", getMilestones);

// Preferences
router.put("/preferences", updateGamificationPreferences);

export default router;
