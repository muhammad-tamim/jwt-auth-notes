import bcrypt from "bcryptjs"
import { pool } from "../../config/db.js"
import jwt from 'jsonwebtoken'
import config from "../../config/index.js"

const sendLoginUserDataToDB = async (email: string, password: string) => {
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email])

    if (result.rows.length === 0) {
        return { message: "Wrong email" }
    }

    const user = result.rows[0]
    const match = await bcrypt.compare(password, user.password)

    if (!match) {
        return { message: "Wrong password" }
    }


    const payload = {
        name: user.name,
        email: user.email,
        role: user.role
    }

    const secret = config.jwtSecret as string

    const token = jwt.sign(payload, secret, { expiresIn: "7d" })

    return { user, token }
}

export const authServices = {
    sendLoginUserDataToDB
}