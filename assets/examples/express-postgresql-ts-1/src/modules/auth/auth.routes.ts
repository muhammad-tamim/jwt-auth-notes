import { Router } from "express";
import { authControllers } from "./auth.controllers.js";

const router = Router()


router.post("/login", authControllers.loginUser)


export const authRoutes = router