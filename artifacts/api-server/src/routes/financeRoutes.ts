import { Router } from "express";
import financeRouter from "./finance";

const router = Router();

router.use("/", financeRouter);

export default router;
