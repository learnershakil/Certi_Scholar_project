import { Router } from 'express';
import { authRouter } from './authRoutes';
import { documentRouter } from './documentRoutes';
import { healthRouter } from './healthRoutes';
import { reviewRouter } from './reviewRoutes';
import { verificationRouter } from './verificationRoutes';
import { scholarshipRouter } from './scholarshipRoutes';
import { recommendationRouter } from './recommendationRoutes';
import { reportingRouter } from './reportingRoutes';
import { caseAssignmentRouter } from './caseAssignmentRoutes';

export const apiRouter: Router = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/documents', documentRouter);
apiRouter.use('/review', reviewRouter);
apiRouter.use('/verification', verificationRouter);
apiRouter.use('/scholarships', scholarshipRouter);
apiRouter.use('/recommendations', recommendationRouter);
apiRouter.use('/reporting', reportingRouter);
apiRouter.use('/cases', caseAssignmentRouter);
