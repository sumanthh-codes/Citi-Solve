import express from 'express';
import { submitSupportMessage } from '../controllers/supportController.js';
import { verifyToken } from '../middleware/auth.js';
import { citizenAuth } from '../middleware/citizen.js';
import { supportSubmitLimiter } from '../middleware/rateLimiter.js';

const supportRouter = express.Router();
supportRouter.use(citizenAuth);
supportRouter.post(
  '/submit', 
  verifyToken,
  supportSubmitLimiter,
  submitSupportMessage
);

export default supportRouter;