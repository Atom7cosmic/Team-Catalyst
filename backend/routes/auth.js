const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const { authMiddleware } = require('../middleware');
const rateLimit = require('express-rate-limit');

// Rate limiting for auth routes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.'
  }
});

// Public routes
router.post('/register', loginLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', loginLimiter, authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Protected routes
router.post('/logout', authMiddleware, authController.logout);
router.post('/change-password', authMiddleware, authController.changePassword);
router.post('/onboarding', authMiddleware, authController.completeOnboarding);
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
