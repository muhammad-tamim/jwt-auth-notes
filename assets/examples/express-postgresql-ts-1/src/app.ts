import express, { Request, Response } from "express";
import initDB from "./config/db.js";
import { userRoutes } from "./modules/user/user.routes.js";
import { todoRoutes } from "./modules/todo/todo.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";

const app = express();
app.use(express.json());

initDB()


app.use("/users", userRoutes)

app.use("/todos", todoRoutes)

app.use("/auth", authRoutes)

app.use((req: Request, res: Response) => {
    res.status(404).json({
        error: "Route Not Found",
        path: req.path
    })
})

app.get("/", (req: Request, res: Response) => {
    res.send("Hello Express!");
});

export default app