import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import ordersRouter from "./orders";
import dashboardRouter from "./dashboard";
import branchesRouter from "./branches";
import ingredientsRouter from "./ingredients";
import semiFinishedRouter from "./semiFinished";
import recipesRouter from "./recipes";
import inventoryRouter from "./inventory";
import shiftAuditsRouter from "./shiftAudits";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(dashboardRouter);
router.use(branchesRouter);
router.use(ingredientsRouter);
router.use(semiFinishedRouter);
router.use(recipesRouter);
router.use(inventoryRouter);
router.use(shiftAuditsRouter);
router.use(storageRouter);

export default router;
