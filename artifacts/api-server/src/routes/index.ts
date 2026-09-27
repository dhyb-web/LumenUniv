import { Router, type IRouter } from "express";
import healthRouter from "./health";
import lumenunivRouter from "./lumenuniv";

const router: IRouter = Router();

router.use(healthRouter);
router.use(lumenunivRouter);

export default router;
