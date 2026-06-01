<h1 align="center">JWT Authorization+Authorization Notes</h1>

- [Introduction:](#introduction)
    - [JWT structure:](#jwt-structure)
- [firebase + JWT:](#firebase--jwt)
  - [JWT with LocalStorage:](#jwt-with-localstorage)
  - [JWT with Cookies:](#jwt-with-cookies)
    - [Without axios interceptor:](#without-axios-interceptor)
    - [With axios interceptor:](#with-axios-interceptor)
- [Firebase + Firebase Admin:](#firebase--firebase-admin)
  - [Without axios interceptor:](#without-axios-interceptor-1)
  - [With axios interceptor:](#with-axios-interceptor-1)
- [Custom Authentication + Authorization (JWT + Cookies):](#custom-authentication--authorization-jwt--cookies)
  - [Express + MongoDB + JS:](#express--mongodb--js)
    - [setup:](#setup)
    - [Example:](#example)
  - [Express + PostgreSQL + TS + Zod (Modular Pattern):](#express--postgresql--ts--zod-modular-pattern)
    - [Setup:](#setup-1)
    - [Example:](#example-1)


# Introduction: 
JWT stands for JSON Web Token. We use JWT to secure our API. It is a compact and secure way to transmit information between a client and a server as a JSON object.

After a user logs in successfully, the server generates a JWT and sends it to the client. The client then includes this token with every request to access protected routes (usually in the Authorization header).

The server verifies the token before allowing access to protected data. Without a valid token, a hacker or unauthorized user cannot access the API. Therefore, to access protected data, users must first log in through our system.

### JWT structure:

A JWT consists of three parts, separated by dots (.): header.payload.signature

![image](./assets/images/jwt.png)

# firebase + JWT:

## JWT with LocalStorage: 

- Frontend:

```js
// AuthProvider.jsx
import { auth } from "../firebase/firebase.init";
import { AuthContext } from "./AuthContext";
import { useEffect, useState } from "react";

import {
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut,
} from "firebase/auth";

import axios from "axios";

export default function AuthProvider = ({ children }) => {
    const googleProvider = new GoogleAuthProvider();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Google Login
    const signInWithGoogle = () => {
        setLoading(true);
        return signInWithPopup(auth, googleProvider);
    };

    // Logout
    const logOut = () => {
        localStorage.removeItem("token");
        return signOut(auth);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(
            auth,
            async (currentUser) => {
                setUser(currentUser);

                if (currentUser?.email) {
                    try {
                        // Get user from database
                        const res = await axios.get(`${import.meta.env.VITE_API_URL}/users/${currentUser.email}`);

                        const dbUser = res.data.result;

                        // JWT Payload
                        const payload = {
                            id: dbUser._id,
                            email: dbUser.email,
                            role: dbUser.role,
                        };

                        // Create JWT
                        const jwtRes = await axios.post( `${import.meta.env.VITE_API_URL}/jwt`,payload);

                        localStorage.setItem("token",jwtRes.data.token);

                    } catch (error) {
                        console.error(error);
                    }
                }

                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const authData = {
        user,
        setUser,
        logOut,
        signInWithGoogle,
        loading,
        setLoading,
    };

    return (
        <AuthContext value={authData}>
            {children}
        </AuthContext>
    );
};
```

```js
// AllUsers.jsx
import React, { useEffect, useState } from 'react'
import axios from 'axios'

const AllUsers = () => {
  const [users, setUsers] = useState([])

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((res) => setUsers(res.data))
      .catch((err) => console.log(err))
  }, [])

  return (
    <div className="p-5">
      <h2 className="text-xl font-bold mb-4">All Users</h2>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>{user._id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AllUsers
```

- Backend: 

```bash
npm init -y
```

```bash
npm i express mongodb nodemon cors dotenv jsonwebtoken
```

```js
const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')

const port = process.env.PORT || 3000

const app = express()
app.use(cors({
    origin: ['http://localhost:5173', 'add others frontend urls'],
    credentials: true
}))
app.use(express.json())


const client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


// JWT Middlewares
const verifyJwt = (req, res, next) => {
    try {
        const token = req?.headers?.authorization?.split(' ')[1]

        if (!token) {
            return res.status(401).send({
                success: false,
                message: "Access token missing",
            });
        }

        const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET)

        req.user = decoded;

        next();
    }
    catch {
        return res.status(401).send({
            success: false,
            message: "Authentication failed",
        });
    }
}

const verifyRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).send({
                success: false,
                message: "Authentication required",
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).send({
                success: false,
                message: `Access denied. Required role: ${roles.join(', ')}`,
            });
        }

        next();
    };
};


async function run() {

    const productsCollection = client.db("ProductsDB").collection('products')
    const usersCollection = client.db("productsDB").collection('users')


    // Jwt API
    app.post("/jwt", async (req, res) => {
        const { id, email, role } = req.body
        const token = jwt.sign({ id, email, role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '7d' })
        res.send({ token })
    })

    // products API
    app.post('/products', verifyJwt, verifyRole("SELLER", "ADMIN"), async (req, res) => {
        const product = req.body;
        const result = await productsCollection.insertOne(product);
        res.send(result);
    });

    app.get('/products', async (req, res) => {
        const products = await productsCollection.find({}).toArray();
        res.send(products);
    });

    app.get('/products/:id', verifyJwt, async (req, res) => {
        const id = req.params.id
        const filter = { _id: new ObjectId(id) }
        const result = await productsCollection.findOne(filter);
        res.send(result);
    });

    app.patch('/products/:id', verifyJwt, verifyRole("SELLER"), async (req, res) => {
        const id = req.params.id
        const filter = { _id: new ObjectId(id) }
        const updatedData = req.body;
        const updateDoc = {
            $set: {
                name: updatedData.name,
                description: updatedData.description
            }
        }

        const result = await productsCollection.updateOne(filter, updatedDoc);
        res.send(result);
    });

    app.delete('/products/:id', verifyJwt, verifyRole("SELLER", "ADMIN"), async (req, res) => {
        const result = await productsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.send(result);
    });


    // users API
    app.post('/users', async (req, res) => {
        const user = req.body;
        const result = await usersCollection.insertOne(user);
        res.send(result);
    });

    app.get('/users', verifyJwt, verifyRole("ADMIN"), async (req, res) => {
        const result = await usersCollection.find({}).toArray();
        res.send(result);
    });

    app.get('/users/:id', verifyJwt, verifyRole("USER", "ADMIN"), async (req, res) => {
        const id = req.params.id
        const filter = { _id: new ObjectId(id) }
        const result = await usersCollection.findOne(filter);
        res.send(result);
    });

    app.get('/users/:email', async (req, res) => {
        const email = req.query.email
        const result = await usersCollection.findOne({ email })
        res.send(result)
    })

    app.patch('/users/:id', verifyJwt, verifyRole("USER", "ADMIN"), async (req, res) => {
        const id = req.params.id
        const filter = { _id: new ObjectId(id) }
        const updatedData = req.body;
        const updateDoc = {
            $set: {
                name: updatedData.name,
                email: updatedData.email,
            }
        }

        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
    });

    app.delete('/users/:id', verifyJwt, verifyRole("ADMIN"), async (req, res) => {
        const result = await usersCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
```

```
# .env
MONGODB_URI=mongodb://localhost:27017/
PORT = 3000
JWT_ACCESS_SECRET=48c7ae40080b52a273cd579da2df72099b6d2d1648279ea03b56f2e4b58dcbdc1ca0e6cde63d6771b9f6b11de9e6ccfce1ec1eef7e7c74c8bc02d8bbc15d52f0
# require('crypto').randomBytes(64).toString('hex')
```

## JWT with Cookies: 

### Without axios interceptor: 

- Frontend:

```js
// AuthProvider.jsx
import { auth } from "../firebase/firebase.init";
import { AuthContext } from "./AuthContext";
import { useEffect, useState } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut} from "firebase/auth";
import axios from "axios";

export default function AuthProvider = ({ children }) => {
    const googleProvider = new GoogleAuthProvider();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Google Login
    const signInWithGoogle = () => {
        setLoading(true);
        return signInWithPopup(auth, googleProvider);
    };

    // Logout
    const logOut = async () => {
        await axios.post(
            `${import.meta.env.VITE_API_URL}/jwt-logout`,{},{ withCredentials: true });

        return signOut(auth);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            // If user logged in
            if (currentUser?.email) {
                try {
                    // Get user from DB
                    const res = await axios.get(`${import.meta.env.VITE_API_URL}/users/${currentUser.email}`);

                    const dbUser = res.data.result;

                    // JWT Payload
                    const payload = {
                        id: dbUser._id,
                        email: dbUser.email,
                        role: dbUser.role,
                    };

                    // Create JWT Cookie
                    await axios.post(`${import.meta.env.VITE_API_URL}/jwt`,payload, { withCredentials: true });

                } catch (error) {
                    console.error(error);
                }
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const authData = {
        user,
        setUser,
        loading,
        setLoading,
        signInWithGoogle,
        logOut,
    };

    return (
        <AuthContext value={authData}>
            {children}
        </AuthContext>
    );
};
```

```js
// AllUsers.jsx
import React, { useEffect, useState } from 'react'
import axios from 'axios'

const AllUsers = () => {
    const [users, setUsers] = useState([])

    useEffect(() => {
        axios.get(`${import.meta.env.VITE_API_URL}/users`, { withCredentials: true })
            .then((res) => setUsers(res.data))
            .catch((err) => console.log(err))
    }, [])

    return (
        <div className="p-5">
            <h2 className="text-xl font-bold mb-4">All Users</h2>

            <div className="overflow-x-auto">
                <table className="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                        </tr>
                    </thead>

                    <tbody>
                        {users.map((user) => (
                            <tr key={user._id}>
                                <td>{user._id}</td>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>{user.role}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default AllUsers
```

- Backend:

```bash
npm init -y
```

```bash
npm i express mongodb nodemon cors dotenv jsonwebtoken cookie-parser
```

```js
const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')

const port = process.env.PORT || 3000

const app = express()
app.use(cors({
    origin: ['http://localhost:5173', 'add others frontend urls'],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())

const client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


// JWT Middlewares
const verifyJwt = (req, res, next) => {
    try {
        const token = req?.cookies?.token

        if (!token) {
            return res.status(401).send({
                success: false,
                message: "Access token missing",
            });
        }

        const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET)

        req.user = decoded;

        next();
    }
    catch {
        return res.status(401).send({
            success: false,
            message: "Authentication failed",
        });
    }
}

const verifyRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).send({
                success: false,
                message: "Authentication required",
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).send({
                success: false,
                message: `Access denied. Required role: ${roles.join(', ')}`,
            });
        }

        next();
    };
};


async function run() {

    const productsCollection = client.db("ProductsDB").collection('products')
    const usersCollection = client.db("productsDB").collection('users')


    // Jwt API
    app.post("/jwt", async (req, res) => {
        const { id, email, role } = req.body
        const token = jwt.sign({ id, email, role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '7d' })

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,       // true in production 
            sameSite: "lax",     // "none" in production
        })

        res.send({
            success: true,
            message: "Authentication successful",
        })
    })

    app.post('/jwt-logout', (req, res) => {
        res.clearCookie('token', {
            httpOnly: true,
            secure: false,       // true in production 
            sameSite: "lax",     // "none" in production
        })
        res.send({
            success: true,
            message: "User logged out and token cleared",
        })

    })

    // products API
    app.post('/products', verifyJwt, verifyRole("SELLER", "ADMIN"), async (req, res) => {
        const product = req.body;
        const result = await productsCollection.insertOne(product);
        res.send(result);
    });

    app.get('/products', async (req, res) => {
        const products = await productsCollection.find({}).toArray();
        res.send(products);
    });

    app.get('/products/:id', verifyJwt, async (req, res) => {
        const id = req.params.id
        const filter = { _id: new ObjectId(id) }
        const result = await productsCollection.findOne(filter);
        res.send(result);
    });

    app.patch('/products/:id', verifyJwt, verifyRole("SELLER"), async (req, res) => {
        const id = req.params.id
        const filter = { _id: new ObjectId(id) }
        const updatedData = req.body;
        const updateDoc = {
            $set: {
                name: updatedData.name,
                description: updatedData.description
            }
        }

        const result = await productsCollection.updateOne(filter, updatedDoc);
        res.send(result);
    });

    app.delete('/products/:id', verifyJwt, verifyRole("SELLER", "ADMIN"), async (req, res) => {
        const result = await productsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.send(result);
    });


    // users API
    app.post('/users', async (req, res) => {
        const user = req.body;
        const result = await usersCollection.insertOne(user);
        res.send(result);
    });

    app.get('/users', verifyJwt, verifyRole("ADMIN"), async (req, res) => {
        const result = await usersCollection.find({}).toArray();
        res.send(result);
    });

    app.get('/users/:id', verifyJwt, verifyRole("USER", "ADMIN"), async (req, res) => {
        const id = req.params.id
        const filter = { _id: new ObjectId(id) }
        const result = await usersCollection.findOne(filter);
        res.send(result);
    });

    app.get('/users/:email', async (req, res) => {
        const email = req.query.email
        const result = await usersCollection.findOne({ email })
        res.send(result)
    })

    app.patch('/users/:id', verifyJwt, verifyRole("USER", "ADMIN"), async (req, res) => {
        const id = req.params.id
        const filter = { _id: new ObjectId(id) }
        const updatedData = req.body;
        const updateDoc = {
            $set: {
                name: updatedData.name,
                email: updatedData.email,
            }
        }

        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
    });

    app.delete('/users/:id', verifyJwt, verifyRole("ADMIN"), async (req, res) => {
        const result = await usersCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
```

```
# .env
MONGODB_URI=mongodb://localhost:27017/
PORT = 3000
JWT_ACCESS_SECRET=48c7ae40080b52a273cd579da2df72099b6d2d1648279ea03b56f2e4b58dcbdc1ca0e6cde63d6771b9f6b11de9e6ccfce1ec1eef7e7c74c8bc02d8bbc15d52f0
# require('crypto').randomBytes(64).toString('hex')
```

### With axios interceptor: 

- Frontend:

```js
// AuthProvider.jsx
import { auth } from "../firebase/firebase.init";
import { AuthContext } from "./AuthContext";
import { useEffect, useState } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut} from "firebase/auth";
import axios from "axios";

export default function AuthProvider = ({ children }) => {
    const googleProvider = new GoogleAuthProvider();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Google Login
    const signInWithGoogle = () => {
        setLoading(true);
        return signInWithPopup(auth, googleProvider);
    };

    // Logout
    const logOut = async () => {
        await axios.post(
            `${import.meta.env.VITE_API_URL}/jwt-logout`,{},{ withCredentials: true });

        return signOut(auth);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            // If user logged in
            if (currentUser?.email) {
                try {
                    // Get user from DB
                    const res = await axios.get(`${import.meta.env.VITE_API_URL}/users/${currentUser.email}`);

                    const dbUser = res.data.result;

                    // JWT Payload
                    const payload = {
                        id: dbUser._id,
                        email: dbUser.email,
                        role: dbUser.role,
                    };

                    // Create JWT Cookie
                    await axios.post(`${import.meta.env.VITE_API_URL}/jwt`,payload, { withCredentials: true });

                } catch (error) {
                    console.error(error);
                }
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const authData = {
        user,
        setUser,
        loading,
        setLoading,
        signInWithGoogle,
        logOut,
    };

    return (
        <AuthContext value={authData}>
            {children}
        </AuthContext>
    );
};
```

```js
// api/axiosSecure.js
import axios from 'axios'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/firebase.init'

const axiosSecure = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
})

let isLoggingOut = false

axiosSecure.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response?.status

        if (status === 401 && !isLoggingOut) {
            isLoggingOut = true

            try {
                // use plain axios to avoid interceptor loop
                await axios.post(
                    `${import.meta.env.VITE_API_URL}/jwt-logout`,
                    {},
                    { withCredentials: true }
                )

                await signOut(auth)
            } catch (err) {
                console.log(err)
            } finally {
                isLoggingOut = false
            }

            window.location.replace('/signin')
        }

        return Promise.reject(error)
    }
)

export default axiosSecure
```

```js
// Simple Version
import axios from 'axios'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/firebase.init'

const axiosSecure = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true
})

axiosSecure.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            signOut(auth)
            window.location.href = '/signin'
        }
        return Promise.reject(error)
    }
)

export default axiosSecure
```

```js
// AllUsers.jsx
import React, { useEffect, useState } from 'react'
import axiosSecure from './api/axiosSecure'

const AllUsers = () => {
    const [users, setUsers] = useState([])

    useEffect(() => {
        axiosSecure.get(`${import.meta.env.VITE_API_URL}/users`, { withCredentials: true })
            .then((res) => setUsers(res.data))
            .catch((err) => console.log(err))
    }, [])

    return (
        <div className="p-5">
            <h2 className="text-xl font-bold mb-4">All Users</h2>

            <div className="overflow-x-auto">
                <table className="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                        </tr>
                    </thead>

                    <tbody>
                        {users.map((user) => (
                            <tr key={user._id}>
                                <td>{user._id}</td>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>{user.role}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default AllUsers
```


- Backend:

```bash
npm init -y
```

```bash
npm i express mongodb nodemon cors dotenv jsonwebtoken cookie-parser
```

```js
const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')

const port = process.env.PORT || 3000

const app = express()
app.use(cors({
    origin: ['http://localhost:5173', 'add others frontend urls'],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())

const client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


// JWT Middlewares
const verifyJwt = (req, res, next) => {
    try {
        const token = req?.cookies?.token

        if (!token) {
            return res.status(401).send({
                success: false,
                message: "Access token missing",
            });
        }

        const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET)

        req.user = decoded;

        next();
    }
    catch {
        return res.status(401).send({
            success: false,
            message: "Authentication failed",
        });
    }
}

const verifyRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).send({
                success: false,
                message: "Authentication required",
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).send({
                success: false,
                message: `Access denied. Required role: ${roles.join(', ')}`,
            });
        }

        next();
    };
};


async function run() {

    const productsCollection = client.db("ProductsDB").collection('products')
    const usersCollection = client.db("productsDB").collection('users')


    // Jwt API
    app.post("/jwt", async (req, res) => {
        const { id, email, role } = req.body
        const token = jwt.sign({ id, email, role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '7d' })

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,       // true in production 
            sameSite: "lax",     // "none" in production
        })

        res.send({
            success: true,
            message: "Authentication successful",
        })
    })

    app.post('/jwt-logout', (req, res) => {
        res.clearCookie('token', {
            httpOnly: true,
            secure: false,       // true in production 
            sameSite: "lax",     // "none" in production
        })
        res.send({
            success: true,
            message: "User logged out and token cleared",
        })

    })

    // products API
    app.post('/products', verifyJwt, verifyRole("SELLER", "ADMIN"), async (req, res) => {
        const product = req.body;
        const result = await productsCollection.insertOne(product);
        res.send(result);
    });

    app.get('/products', async (req, res) => {
        const products = await productsCollection.find({}).toArray();
        res.send(products);
    });

    app.get('/products/:id', verifyJwt, async (req, res) => {
        const id = req.params.id
        const filter = { _id: new ObjectId(id) }
        const result = await productsCollection.findOne(filter);
        res.send(result);
    });

    app.patch('/products/:id', verifyJwt, verifyRole("SELLER"), async (req, res) => {
        const id = req.params.id
        const filter = { _id: new ObjectId(id) }
        const updatedData = req.body;
        const updateDoc = {
            $set: {
                name: updatedData.name,
                description: updatedData.description
            }
        }

        const result = await productsCollection.updateOne(filter, updatedDoc);
        res.send(result);
    });

    app.delete('/products/:id', verifyJwt, verifyRole("SELLER", "ADMIN"), async (req, res) => {
        const result = await productsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.send(result);
    });


    // users API
    app.post('/users', async (req, res) => {
        const user = req.body;
        const result = await usersCollection.insertOne(user);
        res.send(result);
    });

    app.get('/users', verifyJwt, verifyRole("ADMIN"), async (req, res) => {
        const result = await usersCollection.find({}).toArray();
        res.send(result);
    });

    app.get('/users/:id', verifyJwt, verifyRole("USER", "ADMIN"), async (req, res) => {
        const id = req.params.id
        const filter = { _id: new ObjectId(id) }
        const result = await usersCollection.findOne(filter);
        res.send(result);
    });

    app.get('/users/:email', async (req, res) => {
        const email = req.query.email
        const result = await usersCollection.findOne({ email })
        res.send(result)
    })

    app.patch('/users/:id', verifyJwt, verifyRole("USER", "ADMIN"), async (req, res) => {
        const id = req.params.id
        const filter = { _id: new ObjectId(id) }
        const updatedData = req.body;
        const updateDoc = {
            $set: {
                name: updatedData.name,
                email: updatedData.email,
            }
        }

        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
    });

    app.delete('/users/:id', verifyJwt, verifyRole("ADMIN"), async (req, res) => {
        const result = await usersCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
```

```
# .env
MONGODB_URI=mongodb://localhost:27017/
PORT = 3000
JWT_ACCESS_SECRET=48c7ae40080b52a273cd579da2df72099b6d2d1648279ea03b56f2e4b58dcbdc1ca0e6cde63d6771b9f6b11de9e6ccfce1ec1eef7e7c74c8bc02d8bbc15d52f0
# require('crypto').randomBytes(64).toString('hex')
```

# Firebase + Firebase Admin:

**Note:** Instead of using JWT here we used firebase admin

## Without axios interceptor:

- Frontend: 

```js
// AuthProvider.jsx
import { auth } from '../firebase/firebase.init'
import { AuthContext } from './AuthContext'
import { useEffect, useState } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, } from 'firebase/auth'

const AuthProvider = ({ children }) => {
  const googleProvider = new GoogleAuthProvider()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const signInWithGoogle = () => {
    setLoading(true)
    return signInWithPopup(auth, googleProvider)
  }

  const logOut = () => {
    return signOut(auth)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser)
      setLoading(false)

    })
    return () => {
      unsubscribe()
    }
  }, [])

  const authData = {
    user,
    setUser,
    logOut,
    signInWithGoogle,
    loading,
    setLoading,
  }
  return <AuthContext value={authData}>{children}</AuthContext>
}

export default AuthProvider
```

```js
// AllUsers.jsx
import React, { useEffect, useState } from 'react'
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';

const AllUsers = () => {
    const [users, setUsers] = useState([])
    const { user } = useContext(AuthContext)

    useEffect(() => {
        axios.get(`${import.meta.env.VITE_API_URL}/users`, {
            headers: {
                Authorization: `Bearer ${user?.accessToken}`
            }
        })
            .then((res) => setUsers(res.data))
            .catch((err) => console.log(err))
    }, [])

    return (
        <div className="p-5">
            <h2 className="text-xl font-bold mb-4">All Users</h2>

            <div className="overflow-x-auto">
                <table className="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                        </tr>
                    </thead>

                    <tbody>
                        {users.map((user) => (
                            <tr key={user._id}>
                                <td>{user._id}</td>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>{user.role}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default AllUsers
```

- Backend: 

Step 1: 

```bash
npm i firebase-admin
```

Step 2: Go to firebase console: (Project Overview --> General --> Service Accounts) and generate private key

![alt text](./assets/images/firebase-admin.png)

step 3: Convert the private key to base64 and store it into the env:

```js
MONGODB_URI = .....................
PORT = 3000
FB_SERVICE_KEY=...................................................................

# const fs = require('fs')
# const jsonData = fs.readFileSync('./serviceAccountKey.json')

# const base64String = Buffer.from(jsonData, 'utf-8').toString('base64')
# console.log(base64String)
```


step 4: 

```js
const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require("firebase-admin");

const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf-8')
const serviceAccount = JSON.parse(decoded);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const port = process.env.PORT || 3000

const app = express()
app.use(cors({
    origin: ['http://localhost:5173', 'add others frontend urls'],
    credentials: true
}))
app.use(express.json())

const client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


// firebase Middlewares
const verifyToken = (req, res, next) => {
    try {
        const token = req?.headers?.authorization?.split(' ')[1]

        if (!token) {
            return res.status(401).send({
                success: false,
                message: "Access token missing",
            });
        }

        const decoded = await admin.auth().verifyIdToken(token)
        // const decoded = await getAuth().verifyIdToken(token) // if use use const { getAuth } = require("firebase-admin/auth")

        req.user = decoded;

        next();
    }
    catch {
        return res.status(401).send({
            success: false,
            message: "Authentication failed",
        });
    }
}

const verifyRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).send({
                success: false,
                message: "Authentication required",
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).send({
                success: false,
                message: `Access denied. Required role: ${roles.join(', ')}`,
            });
        }

        next();
    };
};


async function run() {

    const productsCollection = client.db("ProductsDB").collection('products')
    const usersCollection = client.db("productsDB").collection('users')

    // products API
    app.post('/products', verifyToken, verifyRole("SELLER", "ADMIN"), async (req, res) => {
        const product = req.body;
        const result = await productsCollection.insertOne(product);
        res.send(result);
    });

    app.get('/products', async (req, res) => {
        const products = await productsCollection.find({}).toArray();
        res.send(products);
    });

    app.get('/products/:id', verifyToken, async (req, res) => {
        const id = req.params.id
        const filter = { _id: new ObjectId(id) }
        const result = await productsCollection.findOne(filter);
        res.send(result);
    });

    app.patch('/products/:id', verifyToken, verifyRole("SELLER"), async (req, res) => {
        const id = req.params.id
        const filter = { _id: new ObjectId(id) }
        const updatedData = req.body;
        const updateDoc = {
            $set: {
                name: updatedData.name,
                description: updatedData.description
            }
        }

        const result = await productsCollection.updateOne(filter, updatedDoc);
        res.send(result);
    });

    app.delete('/products/:id', verifyToken, verifyRole("SELLER", "ADMIN"), async (req, res) => {
        const result = await productsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.send(result);
    });


    // users API
    app.post('/users', async (req, res) => {
        const user = req.body;
        const result = await usersCollection.insertOne(user);
        res.send(result);
    });

    app.get('/users', verifyToken, verifyRole("ADMIN"), async (req, res) => {
        const result = await usersCollection.find({}).toArray();
        res.send(result);
    });

    app.get('/users/:id', verifyToken, verifyRole("USER", "ADMIN"), async (req, res) => {
        const id = req.params.id
        const filter = { _id: new ObjectId(id) }
        const result = await usersCollection.findOne(filter);
        res.send(result);
    });

    app.get('/users/:email', async (req, res) => {
        const email = req.query.email
        const result = await usersCollection.findOne({ email })
        res.send(result)
    })

    app.patch('/users/:id', verifyToken, verifyRole("USER", "ADMIN"), async (req, res) => {
        const id = req.params.id
        const filter = { _id: new ObjectId(id) }
        const updatedData = req.body;
        const updateDoc = {
            $set: {
                name: updatedData.name,
                email: updatedData.email,
            }
        }

        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
    });

    app.delete('/users/:id', verifyToken, verifyRole("ADMIN"), async (req, res) => {
        const result = await usersCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
```

## With axios interceptor: 

```js
//api/axiosSecure.js
import axios from 'axios'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/firebase.init'

const axiosSecure = axios.create({
    baseURL: import.meta.env.VITE_API_URL
})

// ✅ REQUEST interceptor (attach Firebase token)
axiosSecure.interceptors.request.use(async (config) => {
    const user = auth.currentUser
    if (user) {
        const token = await user.getIdToken()
        config.headers.authorization = `Bearer ${token}`
    }
    return config
},
    error => Promise.reject(error)
)

// ✅ RESPONSE interceptor (auto logout)
axiosSecure.interceptors.response.use(response => response, error => {
    const status = error.response?.status
    if (status === 401 || status === 403) {
        signOut(auth)
        window.location.href = '/signin'
    }
    return Promise.reject(error)
}
)

export default axiosSecure
```

```js
// Better version
import axios from 'axios'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/firebase.init'

const axiosSecure = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
})

let isLoggingOut = false

axiosSecure.interceptors.request.use(async (config) => {
    const user = auth.currentUser

    if (user) {
        const token = await user.getIdToken()
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
})

axiosSecure.interceptors.response.use(
    (res) => res,
    async (error) => {
        const status = error.response?.status

        if ((status === 401 || status === 403) && !isLoggingOut) {
            isLoggingOut = true

            try {
                await signOut(auth)
            } finally {
                isLoggingOut = false
                window.location.replace('/signin')
            }
        }

        return Promise.reject(error)
    }
)
```

```jsx
// AllUsers.jsx
import React, { useEffect, useState } from 'react'
import axiosSecure from './api/axiosSecure';

const AllUsers = () => {
    const [users, setUsers] = useState([])

    useEffect(() => {
        axiosSecure.get(`${import.meta.env.VITE_API_URL}/users`)
            .then((res) => setUsers(res.data))
            .catch((err) => console.log(err))
    }, [])

    return (
        <div className="p-5">
            <h2 className="text-xl font-bold mb-4">All Users</h2>

            <div className="overflow-x-auto">
                <table className="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                        </tr>
                    </thead>

                    <tbody>
                        {users.map((user) => (
                            <tr key={user._id}>
                                <td>{user._id}</td>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>{user.role}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default AllUsers
```

# Custom Authentication + Authorization (JWT + Cookies):

## Express + MongoDB + JS: 
### setup: 
  
```bash
npm init -y
npm i express mongodb nodemon cors dotenv jsonwebtoken cookie-parser bcrypt
```

```js
// .env
MONGODB_URI=mongodb://localhost:27017/
PORT=3000
JWT_ACCESS_SECRET=your_jwt_secret_key
```

```json
// package.json
{
  "name": "jwt-auth",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs",
  "dependencies": {
    "bcrypt": "^6.0.0",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "jsonwebtoken": "^9.0.3",
    "mongodb": "^7.2.0",
    "nodemon": "^3.1.14"
  }
}
```

### Example: 

```js
// index.js

const express = require('express')
const cors = require('cors')
require('dotenv').config()

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt');

const port = process.env.PORT || 3000
const isProduction = process.env.NODE_ENV === "production";

const app = express()

app.use(cors({
    origin: ['http://localhost:5173', 'add other frontend urls'],
    credentials: true
}))

app.use(express.json())
app.use(cookieParser())

const client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {

    const productsCollection = client.db("testDB").collection('products')
    const usersCollection = client.db("testDB").collection('users')

    // Middlewares
    const verifyJwt = async (req, res, next) => {
        try {
            const token = req?.cookies?.token

            if (!token) {
                return res.status(401).send({
                    success: false,
                    message: "Access token missing",
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)

            const filter= { _id: new ObjectId(decoded.id) }
            const user = await usersCollection.findOne(filter, { projection: { password: 0 } })
            // in projection 0 means exclude that field from the result

            if (!user) {
                return res.status(401).send({
                    success: false,
                    message: "User not found",
                });
            }

            req.user = user

            next()

        }
        catch (error) {
            console.log(error)
            return res.status(401).send({
                success: false,
                message: "Authentication failed",
            });

        }
    }

    const verifyRole = (...roles) => {

        return (req, res, next) => {

            if (!req.user) {
                return res.status(401).send({
                    success: false,
                    message: "Authentication required",
                });
            }

            if (!roles.includes(req.user.role)) {
                return res.status(403).send({
                    success: false,
                    message: `Access denied. Required role: ${roles.join(', ')}`,
                });
            }

            next();
        };
    };


    // Auth API
    app.post('/auth/register', async (req, res) => {
        try {
            const { name, email, password } = req.body;

            const existingUser = await usersCollection.findOne({ email });

            if (existingUser) {
                return res.status(409).send({
                    success: false,
                    message: "User already exists",
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = {
                name,
                email,
                image: "https://test-image.com",
                password: hashedPassword,
                role: "user",
            };

            await usersCollection.insertOne(user);

            return res.status(201).send({
                success: true,
                message: "User registered successfully",
                data: user
            });

        }
        catch (error) {
            console.log(error)
            return res.status(500).send({
                success: false,
                message: "Registration failed",
            });

        }

    });

    app.post('/auth/login', async (req, res) => {
        try {
            const { email, password } = req.body;

            const user = await usersCollection.findOne({ email });

            if (!user) {
                return res.status(401).send({
                    success: false,
                    message: "Invalid credentials",
                });
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(401).send({
                    success: false,
                    message: "Invalid credentials",
                });
            }

            const payload = { id: user._id }

            const token = jwt.sign(
                payload,
                process.env.JWT_ACCESS_SECRET,
                { expiresIn: '7d' }
            );

            res.cookie('token', token, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? "none" : "lax",
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            return res.status(200).send({
                success: true,
                message: "Login successful",
            });

        }
        catch (error) {
            console.log(error)
            return res.status(500).send({
                success: false,
                message: "Login failed",
            });

        }

    });

    app.post('/auth/logout', (req, res) => {
        try {
            res.clearCookie('token', {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? "none" : "lax",
            });

            return res.status(200).send({
                success: true,
                message: "Logged out successfully"
            });
        }
        catch (error) {
            console.log(error)
            return res.status(500).send({
                success: false,
                message: "Logout failed",
            });
        }

    });

    app.get('/auth/me', verifyJwt, async (req, res) => {
        try {
            return res.status(200).send({
                success: true,
                message: "User fetched successfully",
                data: req.user
            });
        }
        catch (error) {
            console.log(error)
            return res.status(500).send({
                success: false,
                message: "Failed to fetch user",
            });

        }

    });

    // Users API
    app.get('/users', verifyJwt, verifyRole("admin"), async (req, res) => {
        try {
            const users = await usersCollection.find({}, { projection: { password: 0 } }).toArray();

            return res.status(200).send({
                success: true,
                message: "Users fetched successfully",
                data: users
            });
        }
        catch (error) {
            console.log(error)
            return res.status(500).send({
                success: false,
                message: "Failed to fetch users",
            });
        }
    });

    app.get('/users/id/:id', verifyJwt, verifyRole("admin"), async (req, res) => {
        try {
            const id = req.params.id;

            const user = await usersCollection.findOne({ _id: new ObjectId(id) }, { projection: { password: 0 } });

            if (!user) {
                return res.status(404).send({
                    success: false,
                    message: "User not found",
                });
            }

            return res.status(200).send({
                success: true,
                message: "User fetched successfully",
                data: user
            });

        }
        catch (error) {
            console.log(error)
            return res.status(500).send({
                success: false,
                message: "Failed to fetch user",
            });

        }
    });

    app.patch('/users/role/:id', verifyJwt, verifyRole("admin"), async (req, res) => {
        try {
            const id = req.params.id;
            const { role } = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role
                }
            };

            const result = await usersCollection.updateOne(filter, updateDoc);

            if (result.matchedCount === 0) {
                return res.status(404).send({
                    success: false,
                    message: "User not found",
                });
            }

            return res.status(200).send({
                success: true,
                message: "User role updated successfully",
            });

        }
        catch (error) {
            console.log(error)
            return res.status(500).send({
                success: false,
                message: "Failed to update role",
            });

        }

    });

    app.delete('/users/:id', verifyJwt, verifyRole("admin"), async (req, res) => {
        try {
            const id = req.params.id;
            const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                return res.status(404).send({
                    success: false,
                    message: "User not found",
                });
            }

            return res.status(200).send({
                success: true,
                message: "User deleted successfully",
            });

        }
        catch (error) {
            console.log(error)
            return res.status(500).send({
                success: false,
                message: "Failed to delete user",
            });

        }

    });


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

}
run().catch(console.dir);

app.get('/', (req, res) => {

    res.status(200).send({
        success: true,
        message: "Server is running",
    });

})

app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
})
```

## Express + PostgreSQL + TS + Zod (Modular Pattern):  

full example: https://github.com/tamim-111/b6a2

### Setup: 

```bash
npm init -y
npm i express pg cors dotenv zod jsonwebtoken cookie-parser bcrypt
npm install -D typescript tsx @types/node @types/express @types/pg @types/cors @types/jsonwebtoken @types/cookie-parser @types/bcrypt 
tsc --init
```

```js
// tsconfig.json
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "module": "nodenext",
    "target": "esnext",
    "lib": [
      "esnext"
    ],
    "types": [
      "node"
    ],
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "strict": true,
    "isolatedModules": true,
    "noUncheckedSideEffectImports": true,
    "moduleDetection": "force",
    "skipLibCheck": true,
  }
}
```

```js
// package.json
{
  "name": "b6a2",
  "version": "1.0.0",
  "description": "",
  "main": "./src/server.ts",
  "scripts": {
    "dev": "tsx watch ./src/server.ts",
    "build": "tsc",
    "start": "node ./dist/server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "module",
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "jsonwebtoken": "^9.0.3",
    "pg": "^8.21.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/bcrypt": "^6.0.0",
    "@types/cookie-parser": "^1.4.10",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node": "^25.9.1",
    "@types/pg": "^8.20.0",
    "tsx": "^4.22.3",
    "typescript": "^6.0.3"
  }
}
```

```js
// .env
DATABASE_URL=postgresql://postgres:hello@localhost:5432/vehiclesDB
PORT=3000
JWT_ACCESS_SECRET=your_jwt_secret_key
```

### Example: 

```
src/
│
├── app.ts
├── server.ts
│
├── config/
│   ├── db.ts
│   └── env.ts
│
├── modules/
│   └── auth/
│       ├── auth.validations.ts
│       ├── auth.types.ts
│       ├── auth.service.ts
│       ├── auth.controller.ts
│       ├── auth.routes.ts
│
├── middlewares/
|    ├── validate.ts
|    ├── verifyJwt.ts
│    └── verifyRole.ts
```

```ts
// src/config/db.ts

import { Pool } from "pg";
import envConfig from "./env.js";

export const pool = new Pool({ connectionString: envConfig.databaseUrl });

export default async function initDB() {
  try {

    await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      image TEXT NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE CHECK (email = LOWER(email)),
      password TEXT NOT NULL CHECK (char_length(password) >= 6),
      phone VARCHAR(14) NOT NULL, 
      role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer'))
      )`)

    // await pool.query(`
    // CREATE TABLE IF NOT EXISTS vehicles (
    //   id SERIAL PRIMARY KEY,
    //   vehicle_name VARCHAR(255) NOT NULL,  
    //   type VARCHAR(10) NOT NULL CHECK (type IN ('suv', 'sedan', 'sports', 'electric')),
    //   registration_number VARCHAR(50) NOT NULL UNIQUE,
    //   daily_rent_price INT NOT NULL CHECK (daily_rent_price > 0),
    //   availability_status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'booked'))
    //   )`)

    // await pool.query(`
    // CREATE TABLE IF NOT EXISTS bookings (
    //   id SERIAL PRIMARY KEY,
    //   customer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    //   vehicle_id INT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    //   rent_start_date TIMESTAMP NOT NULL,
    //   rent_end_date   TIMESTAMP NOT NULL CHECK (rent_end_date > rent_start_date),
    //   total_price INT NOT NULL CHECK (total_price > 0),
    //   status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'returned'))
    //   )`)

    console.log("PostgreSQL connected successfully");
  }
  catch (error) {
    console.log("PostgreSQL connection failed", error);

    process.exit(1);
  }
}
```

```ts
// src/config/env.ts

import dotenv, { config } from "dotenv"

dotenv.config()

const envConfig = {
    databaseUrl: process.env.DATABASE_URL,
    port: process.env.PORT,
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET
}

export default envConfig
```

```ts
// src/middlewares/validate.ts

import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";

export const validate = (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {

    const validation = schema.safeParse(req.body);

    if (!validation.success) {

        const errors = validation.error.issues.map(issue => ({
            field: issue.path.join("."),
            message: issue.message,
        }));

        return res.status(400).send({
            success: false,
            message: "Validation failed",
            errors,
        });
    }

    req.body = validation.data;

    next();
};
```

```ts
// src/middlewares/verifyJwt.ts

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";
import envConfig from "../config/env.js";

type JwtPayload = {
    id: number;
};

export const verifyJwt = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access token missing",
            });
        }

        const decoded = jwt.verify(token, envConfig.jwtAccessSecret!) as JwtPayload

        // PostgreSQL query instead of MongoDB collection
        const result = await pool.query(
            `SELECT id, name, email, phone, role FROM users WHERE id = $1`, [decoded.id]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found",
            });
        }

        req.user = user;

        next();
    } catch (error) {
        console.log(error);

        return res.status(401).json({
            success: false,
            message: "Authentication failed",
        });
    }
};
```

```ts
// src/middlewares/verifyRole.ts

import { Request, Response, NextFunction } from "express";

export const verifyRole = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${roles.join(", ")}`,
            });
        }

        next();
    };
};
```

```ts
// src/types/express.d.ts

import "express";

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
                name: string;
                email: string;
                phone: string;
                role: "admin" | "customer";
            };
        }
    }
}
```

```ts
// src/app.ts

import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import initDB from "./config/db.js";
import { authRoutes } from "./modules/auth/auth.routes.js";


const app = express();

app.use(cors({
    origin: ["http://localhost:5173"],
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

initDB();

app.use("/api/v1/auth", authRoutes);

app.get("/", (_req, res: Response) => {
    return res.status(200).send({
        success: true,
        message: "Server is running",
    });
});

app.use((req: Request, res: Response) => {
    return res.status(404).send({
        success: false,
        message: "Route Not Found",
        path: req.path,
    });
});

export default app;
```

```ts
// src/server.ts

import app from "./app.js";
import envConfig from "./config/env.js";

const port = envConfig.port || 3000;

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
```

```ts
// src/modules/auth/auth.validations.ts

import z from "zod";

export const signUpSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
    image: z.url(),
    email: z.email("Invalid Email").transform((val) => val.toLowerCase()),
    password: z.string().min(6, "Password must be at least 6 characters"),
    phone: z.string().max(14, "Phone number is to long"),
});

export const signInSchema = z.object({
    email: z.email("Invalid Email").transform((val) => val.toLowerCase()),
    password: z.string().min(6, "Password must be at least 6 characters"),
})
```

```ts
// src/modules/auth/auth.types.ts

import z from "zod";
import { signInSchema, signUpSchema } from "./auth.validations.js";

export type signUpUserInput = z.infer<typeof signUpSchema>;

export type signinUserInput = z.infer<typeof signInSchema>;
```

```ts
// src/modules/auth/auth.service.ts

import bcrypt from "bcryptjs";
import { pool } from "../../config/db.js";
import { signinUserInput, signUpUserInput } from "./auth.types.js";
import jwt from "jsonwebtoken";
import envConfig from "../../config/env.js";

export const authService = {
    async signUpUser(payload: signUpUserInput) {
        const { name, image, email, password, phone } = payload;

        const existingUser = await pool.query(`SELECT id FROM users WHERE email = $1`, [email])

        if (existingUser.rows.length > 0) {
            throw new Error("USER_EXISTS");
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const result = await pool.query(`
            INSERT INTO users (name, image, email, password, phone)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, image, email, phone, role`,
            [name, image, email, hashedPassword, phone]
        )

        return result.rows[0]
    },

    async signInUser(payload: signinUserInput) {
        const { email, password } = payload

        const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email])

        const user = result.rows[0]

        if (!user) {
            throw new Error("INVALID_CREDENTIALS")
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
            throw new Error("INVALID_CREDENTIALS")
        }

        const token = jwt.sign(
            { id: user.id },
            envConfig.jwtAccessSecret!,
            { expiresIn: "7d" }
        );

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
            },
            token,
        };

    }
}
```

```ts
// src/modules/auth/auth.controller.ts

import { Request, Response } from "express";
import { authService } from "./auth.service.js";

const isProduction = process.env.NODE_ENV === "production";

export const authController = {
    async signUpUser(req: Request, res: Response) {
        try {
            const result = await authService.signUpUser(req.body)
            return res.status(201).send({
                success: true,
                message: "User signUP successfully",
                data: result,
            });
        }
        catch (error: any) {
            console.log(error);

            if (error.message === "USER_EXISTS") {
                return res.status(409).send({
                    success: false,
                    message: "User already exists",
                });
            }

            return res.status(500).send({
                success: false,
                message: "SignUp failed",
            });
        }
    },

    async signInUser(req: Request, res: Response) {
        try {
            const { user, token } = await authService.signInUser(req.body);

            res.cookie("token", token, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? "none" : "lax",
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            return res.status(200).send({
                success: true,
                message: "SignIn successful",
                data: user,
            });
        } catch (error: any) {
            if (error.message === "INVALID_CREDENTIALS") {
                return res.status(401).json({
                    success: false,
                    message: "Invalid credentials",
                });
            }

            return res.status(500).json({
                success: false,
                message: "SignIn failed",
            });
        }
    },

    async signOutUser(_req: Request, res: Response) {
        try {
            res.clearCookie("token", {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? "none" : "lax",
            });

            return res.status(200).json({
                success: true,
                message: "SignOut out successfully",
            });
        } catch {
            return res.status(500).json({
                success: false,
                message: "SignOut failed",
            });
        }
    },

    async me(req: Request, res: Response) {
        return res.status(200).json({
            success: true,
            message: "User fetched successfully",
            data: req.user,
        });
    }
}
```

```ts
// src/modules/auth/auth.routes.ts

import { Router } from "express";
import { authController } from "./auth.controller.js";
import { verifyJwt } from "../../middlewares/verifyJwt.js";

export const authRoutes = Router();

authRoutes.post("/signup", authController.signUpUser)
authRoutes.post("/signin", authController.signInUser)
authRoutes.post("/signout", authController.signOutUser)
authRoutes.get("/me", verifyJwt, authController.me)
```