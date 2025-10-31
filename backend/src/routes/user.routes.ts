import { Router } from "express";

import { authenticateToken } from "../middleware/auth.middleware";
import { updatePreferences, getProfile, addToBlacklist, addToWhitelist, removeFromBlacklist, removeFromWhitelist, resetListDefaults } from "../controllers/user.controller";
const router = Router();

router.get("/profile", authenticateToken, getProfile);
router.put("preference", authenticateToken, updatePreferences);
router.post("/whitelist", authenticateToken, addToWhitelist);
router.delete("/whitelist/:value", authenticateToken, removeFromWhitelist);
router.post("/blacklist", authenticateToken, addToBlacklist);
router.delete("/blacklist/:value", authenticateToken, removeFromBlacklist);
router.post("/lists/reset", authenticateToken, resetListDefaults);

export default router;


