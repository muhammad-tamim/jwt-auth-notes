import { Router } from "express";
import { userController } from "./user.controllers.js";
import auth from "../../middleware/auth.js";

const router = Router()

router.post("/", userController.createUser)

router.get("/", auth("admin"), userController.getAllUser)

router.get("/:id", auth("admin", "user"), userController.getSingleUser)

router.put("/:id", userController.updateSingleUser)

router.delete("/:id", userController.deleteSingleUser)

export const userRoutes = router