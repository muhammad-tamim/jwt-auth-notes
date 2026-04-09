import { pool } from "../../config/db.js"

const sendTodoIntoDB = async (payload: Record<string, unknown>) => {
    const { user_id, title } = payload
    const result = await pool.query("INSERT INTO todos(user_id, title) VALUES($1, $2) RETURNING *", [user_id, title])

    return result
}

const getAllTodoFromDB = async () => {
    const result = await pool.query("SELECT * FROM todos")

    return result
}

const getSingleTodoFromDB = async (id: string) => {
    const result = await pool.query("SELECT * FROM todos WHERE id=$1", [id])

    return result
}

const updateSingleTodoFromDB = async (title: string, id: string) => {
    const result = await pool.query("UPDATE todos SET title=$1 WHERE id=$2 RETURNING *", [title, id])

    return result
}

const deleteSingleTodoFromDB = async (id: string) => {
    const result = await pool.query("DELETE FROM todos WHERE id=$1", [id])

    return result
}

export const todoServices = {
    sendTodoIntoDB,
    getAllTodoFromDB,
    getSingleTodoFromDB,
    deleteSingleTodoFromDB,
    updateSingleTodoFromDB
}

