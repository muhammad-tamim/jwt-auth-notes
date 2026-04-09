import { Router } from "express";
import { todoControllers } from "./todo.controllers.js";

const router = Router()

router.post("/", todoControllers.createTodo)
router.get("/", todoControllers.getAllTodo)
router.get("/:id", todoControllers.getSingleTodo)
router.put("/:id", todoControllers.updateSingleTodo)
router.delete("/:id", todoControllers.deleteSingleTodo)

export const todoRoutes = router