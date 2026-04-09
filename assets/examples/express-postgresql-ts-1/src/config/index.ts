import dotenv from "dotenv"
import path from "path"


dotenv.config()

// or
// dotenv.config({ path: path.join(process.cwd(), ".env") })
// console.log(process.cwd())
// /home/muhammad-tamim/programming/programming hero/lavel-2/module-12
// console.log(path.join(process.cwd(), '.env'))
// /home/muhammad-tamim/programming/programming hero/lavel-2/module-12/.env



const config = {
    connection_str: process.env.CONNECTION_STR,
    port: process.env.PORT,
    jwtSecret: process.env.JWT_SECRET
}

export default config