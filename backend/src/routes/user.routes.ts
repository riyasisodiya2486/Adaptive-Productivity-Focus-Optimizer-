import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { 
    updatePreferences, 
    getProfile, 
    addToBlacklist, 
    addToWhitelist, 
    removeFromBlacklist, 
    removeFromWhitelist, 
    resetListDefaults 
} from "../controllers/user.controller";

const router = Router();

router.get("/profile", authenticateToken, getProfile);

router.put("/preferences", authenticateToken, updatePreferences);

router.post("/whitelist/add", authenticateToken, addToWhitelist);
router.delete("/whitelist/remove/:value", authenticateToken, removeFromWhitelist);

router.post("/blacklist/add", authenticateToken, addToBlacklist);
router.delete("/blacklist/remove/:value", authenticateToken, removeFromBlacklist);

router.post("/reset-defaults", authenticateToken, resetListDefaults);

export default router;
