import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import ordersRouter from "./orders";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(dashboardRouter);

export default router;
