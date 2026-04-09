import { Request, Response } from "express"
import { userServices } from "./user.services.js"

const createUser = async (req: Request, res: Response) => {
    try {
        const { name, email, role, password } = req.body
        const result = await userServices.sendUserIntoDB(name, email, role, password)
        res.send(result.rows)
    }
    catch (err: any) {
        res.status(500).send({ message: err.message })
    }
}

const getAllUser = async (req: Request, res: Response) => {
    try {
        const result = await userServices.getAllUserFromDB()
        res.send(result.rows)
    }
    catch (err: any) {
        res.status(500).send({ message: err.message })
    }
}

const getSingleUser = async (req: Request, res: Response) => {
    try {
        const id = req.params.id
        const result = await userServices.getSingleUserFromDB(id as string)
        res.send(result.rows[0])
    }
    catch (err: any) {
        res.status(500).send({ message: err.message })
    }
}

const updateSingleUser = async (req: Request, res: Response) => {
    try {
        const id = req.params.id
        const { name, email, password } = req.body
        const result = await userServices.updateSingleUserFromDB(name, email, password, id as string)
        res.send(result.rows[0])
    }
    catch (err: any) {
        res.status(500).send({ message: err.message })
    }
}

const deleteSingleUser = async (req: Request, res: Response) => {
    try {
        const id = req.params.id

        const result = await userServices.deleteSingleUserFromDB(id as string)
        res.send({ message: "User deleted" })
    }
    catch (err: any) {
        res.status(500).send({ message: err.message })
    }
}

export const userController = {
    createUser,
    getAllUser,
    getSingleUser,
    updateSingleUser,
    deleteSingleUser
}
