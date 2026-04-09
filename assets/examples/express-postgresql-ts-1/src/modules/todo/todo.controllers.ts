import { Request, Response } from "express"
import { todoServices } from "./todo.services.js"

const createTodo = async (req: Request, res: Response) => {
    try {
        const result = await todoServices.sendTodoIntoDB(req.body)
        res.send(result.rows)
    }
    catch (err: any) {
        res.status(500).send({ message: err.message })
    }
}

const getAllTodo = async (req: Request, res: Response) => {
    try {
        const result = await todoServices.getAllTodoFromDB()
        res.send(result.rows)
    }
    catch (err: any) {
        res.status(500).send({ message: err.message })
    }
}

const getSingleTodo = async (req: Request, res: Response) => {
    try {
        const id = req.params.id
        const result = await todoServices.getSingleTodoFromDB(id as string)
        res.send(result.rows[0])
    }
    catch (err: any) {
        res.status(500).send({ message: err.message })
    }
}

const updateSingleTodo = async (req: Request, res: Response) => {
    try {
        const id = req.params.id
        const { title } = req.body
        const result = await todoServices.updateSingleTodoFromDB(title, id as string)
        res.send(result.rows[0])
    }
    catch (err: any) {
        res.status(500).send({ message: err.message })
    }
}

const deleteSingleTodo = async (req: Request, res: Response) => {
    try {
        const id = req.params.id
        const result = await todoServices.deleteSingleTodoFromDB(id as string)
        res.send({ message: "todos deleted" })
    }
    catch (err: any) {
        res.status(500).send({ message: err.message })
    }
}

export const todoControllers = {
    createTodo,
    getAllTodo,
    getSingleTodo,
    updateSingleTodo,
    deleteSingleTodo
}