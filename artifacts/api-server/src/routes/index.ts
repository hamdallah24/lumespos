import { Router } from "express";
import authRouter from "./auth";  // ← tambah import
import healthRouter from "./health";
import usersRouter from "./users";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import productVariantsRouter from "./productVariants";
import ordersRouter from "./orders";
import dashboardRouter from "./dashboard";
import branchesRouter from "./branches";
import ingredientsRouter from "./ingredients";
import semiFinishedRouter from "./semiFinished";
import recipesRouter from "./recipes";
import inventoryRouter from "./inventory";
import expensesRouter from "./expenses";
import shiftAuditsRouter from "./shiftAudits";
import storageRouter from "./storage";

const router = Router();

router.use("/", shiftAuditsRouter);
router.use("/", authRouter);  // ← tambah (harus sebelum route lain)
router.use("/", healthRouter);
router.use("/", usersRouter);
router.use("/", categoriesRouter);
router.use("/", productsRouter);
router.use("/", productVariantsRouter);
router.use("/", ordersRouter);
router.use("/", dashboardRouter);
router.use("/", branchesRouter);
router.use("/", ingredientsRouter);
router.use("/", semiFinishedRouter);
router.use("/", recipesRouter);
router.use("/", inventoryRouter);
router.use("/", expensesRouter);
router.use("/", shiftAuditsRouter);
router.use("/", storageRouter);

export default router;