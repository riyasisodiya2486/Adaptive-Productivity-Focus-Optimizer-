import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { deleteSession, endBreak, endSession, getCurrentSession, getSession, getSessions, getSessionStats, getUserStats, pauseSession, resumeSession, startBreak, startSession, updateFocusScore, updateSession } from "../controllers/session.controller";

const router = Router();

router.use(authenticateToken);

//session management
router.post('/start', startSession);
router.get('/current', getCurrentSession);
router.get('/', getSessions);
router.get('/:id', getSession);
router.put('/:id', updateSession);
router.delete('/:id', deleteSession);
router.post('/:id/break/start', startBreak);
router.post('/:id/break/end', endBreak);


//session controls
router.put('/:id/end', endSession);
router.put('/:id/pause', pauseSession);
router.put('/:id/resume', resumeSession);
router.put('/:id/focus', updateFocusScore);

//stats
router.get('/:id/stats', getSessionStats);
router.get('/stats/user', getUserStats);

export default router;