import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../../infrastructure/middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/refresh', authController.refresh.bind(authController));
router.post('/verify-email', authController.verifyEmail.bind(authController));
router.post('/complete-gift-registration', authController.completeGiftRegistration.bind(authController));
router.get('/me', authMiddleware, authController.getMe.bind(authController));
router.get('/personal-qr', authMiddleware, authController.getPersonalQR.bind(authController));
router.get('/personal-qr/image', authMiddleware, authController.getPersonalQRImage.bind(authController));

export { router as authRoutes };

