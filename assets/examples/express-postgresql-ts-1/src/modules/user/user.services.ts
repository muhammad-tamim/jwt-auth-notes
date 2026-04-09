import { pool } from "../../config/db.js"
import bcrypt from "bcryptjs"

const sendUserIntoDB = async (name: string, email: string, role: string, password: string) => {

    const hashedPass = await bcrypt.hash(password, 10)

    const result = await pool.query("INSERT INTO users(name, email, role, password) VALUES($1, $2, $3, $4) RETURNING *",
        [name, email, role, hashedPass])

    return result
}

const getAllUserFromDB = async () => {
    const result = await pool.query("SELECT * FROM users")

    return result
}

const getSingleUserFromDB = async (id: string) => {
    const result = await pool.query("SELECT * FROM users WHERE id=$1", [id])

    return result
}

const updateSingleUserFromDB = async (name: string, email: string, password: string, id: string) => {
    const result = await pool.query("UPDATE users SET name=$1, email=$2, password=$3 WHERE id=$4 RETURNING *",
        [name, email, password, id])

    return result
}

const deleteSingleUserFromDB = async (id: string) => {
    const result = await pool.query("DELETE FROM users WHERE id=$1", [id])

    return result
}

export const userServices = {
    sendUserIntoDB,
    getAllUserFromDB,
    getSingleUserFromDB,
    updateSingleUserFromDB,
    deleteSingleUserFromDB
}