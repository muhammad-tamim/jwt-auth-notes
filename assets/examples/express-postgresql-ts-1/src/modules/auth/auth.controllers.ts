import { Request, Response } from "express";
import { authServices } from "./auth.services.js";

const loginUser = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body
        const result = await authServices.sendLoginUserDataToDB(email, password)
        res.send(result)
    }
    catch (error: any) {
        res.status(500).send({ message: error.message })
    }
}

export const authControllers = {
    loginUser
}