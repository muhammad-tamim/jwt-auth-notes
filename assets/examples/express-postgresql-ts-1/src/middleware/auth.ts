import { NextFunction, Request, Response } from "express"
import jwt, { JwtPayload } from "jsonwebtoken"
import config from "../config/index.js"

const auth = (...roles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = req.headers.authorization

            if (!token) {
                return res.status(500).send({ message: "your are not allowed, please prove valid token" })
            }

            const payload = jwt.verify(token, config.jwtSecret as string) as JwtPayload

            req.user = payload

            if (roles.length && !roles.includes(payload.role as string)) {
                return res.status(500).send({ message: "Your are not allowed to see" })
            }

            return next()
        }
        catch (err: any) {
            res.send({ message: err.message })
        }
    }
}

export default auth