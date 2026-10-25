import { Router } from 'express';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      service: 'MedEase AI backend',
      environment: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
    },
    message: 'Backend is running correctly.',
  });
});

export default router;
