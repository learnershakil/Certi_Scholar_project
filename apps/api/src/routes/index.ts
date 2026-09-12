import { Router } from 'express';
import { authRouter } from './authRoutes';
import { documentRouter } from './documentRoutes';
import { healthRouter } from './healthRoutes';

export const apiRouter: Router = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/documents', documentRouter);
