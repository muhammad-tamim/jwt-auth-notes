<h1 align="center">JWT Authorization Notes</h1>

- [Introduction:](#introduction)
    - [JWT structure:](#jwt-structure)
- [Authentication with firebase + Authorization with JWT:](#authentication-with-firebase--authorization-with-jwt)
  - [JWT with LocalStorage:](#jwt-with-localstorage)
  - [JWT with Cookies:](#jwt-with-cookies)
    - [Without axios interceptor:](#without-axios-interceptor)
    - [With axios interceptor:](#with-axios-interceptor)
- [Authorization + Authorization with firebase:](#authorization--authorization-with-firebase)
  - [Without axios interceptor:](#without-axios-interceptor-1)
  - [With axios interceptor:](#with-axios-interceptor-1)
- [Custom Authentication + Authorization with Cookies:](#custom-authentication--authorization-with-cookies)
  - [Setup:](#setup)
  - [Example 1:](#example-1)
  - [Example 2:](#example-2)
  - [Example 3:](#example-3)


# Introduction: 
JWT stands for JSON Web Token. We use JWT to secure our API. It is a compact and secure way to transmit information between a client and a server as a JSON object.

After a user logs in successfully, the server generates a JWT and sends it to the client. The client then includes this token with every request to access protected routes (usually in the Authorization header).

The server verifies the token before allowing access to protected data. Without a valid token, a hacker or unauthorized user cannot access the API. Therefore, to access protected data, users must first log in through our system.

### JWT structure:

A JWT consists of three parts, separated by dots (.): header.payload.signature

![image](./assets/images/jwt.png)

# Authentication with firebase + Authorization with JWT:

## JWT with LocalStorage: 

- Frontend:

```js
// AuthProvider.jsx
import { auth } from '../firebase/firebase.init'
import { AuthContext } from './AuthContext'
import { useEffect, useState } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, } from 'firebase/auth'
import axios from 'axios'

const AuthProvider = ({ children }) => {
  const googleProvider = new GoogleAuthProvider()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const signInWithGoogle = () => {
    setLoading(true)
    return signInWithPopup(auth, googleProvider)
  }

  const logOut = () => {
    localStorage.removeItem('token')
    return signOut(auth)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser)

      if (currentUser?.email) {
        axios.post(`${import.meta.env.VITE_API_URL}/jwt`, { email: currentUser?.email })
          .then(data => {
            console.log(data.data)
            localStorage.setItem('token', data.data.token)
          })
      }

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
// MyRecipes.jsx
import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';

const MyRecipes = () => {
    const { user } = useContext(AuthContext)

    const [recipes, setRecipes] = useState([])

    useEffect(() => {

        axios.get(`${import.meta.env.VITE_API_URL}/recipes/${user.email}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        })
            .then(data => setRecipes(data?.data))
            .catch(err => console.log(err))

    }, [user])

    return (
        <div className='grid grid-cols-5 gap-5'>
            {recipes.map(recipe => <div key={recipe._id} className='border'>
                <img src={recipe.image} className='size-20' />
                <p>{recipe.title}</p>
            </div>
            )}
        </div>
    );
};

export default MyRecipes;
```

- Backend: 

```bash
npm i jsonwebtoken
```

```js
const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')

const port = process.env.PORT || 3000

const app = express()
app.use(cors())
app.use(express.json())

const client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// JWT Middleware
const verifyJwt = (req, res, next) => {
    const token = req?.headers?.authorization?.split(' ')[1]
    if (!token) return res.status(401).send({ message: "Unauthorized assess" })

    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "Unauthorized assess" })
        }
        req.user = decoded;
        next()
    })
}

async function run() {

    await client.connect();

    const recipesCollection = client.db("recipesDB").collection('recipes')

    app.post("/jwt", async (req, res) => {
        const email = req.body.email
        const token = jwt.sign({ email }, process.env.JWT_SECRET_KEY, { expiresIn: '7d' })
        res.send({ token })
    })

    app.get('/recipes', async (req, res) => {
        const result = await recipesCollection.find({}).toArray();
        res.send(result);
    });

    app.get('/recipes/:email', verifyJwt, async (req, res) => {
        const email = req.params.email

        if (req.user.email !== email) return res.status(403).send({ message: "Forbidden access" });

        const filter = { email }
        const result = await recipesCollection.find(filter).toArray();
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

```js
// env
MONGODB_URI = .......... 
PORT = ......
JWT_SECRET_KEY = ..................
require('crypto').randomBytes(64).toString('hex')
```

## JWT with Cookies: 

### Without axios interceptor: 

- Frontend:

```js
// AuthProvider.jsx
import { auth } from '../firebase/firebase.init'
import { AuthContext } from './AuthContext'
import { useEffect, useState } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, } from 'firebase/auth'
import axios from 'axios'

const AuthProvider = ({ children }) => {
  const googleProvider = new GoogleAuthProvider()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const signInWithGoogle = () => {
    setLoading(true)
    return signInWithPopup(auth, googleProvider)
  }

  const logOut = () => {
    return axios.post(`${import.meta.env.VITE_API_URL}/jwt-logout`, { withCredentials: true })
      .then(() => signOut(auth))
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser)

      if (currentUser?.email) {
        axios.post(`${import.meta.env.VITE_API_URL}/jwt`,
          { email: currentUser?.email },
          { withCredentials: true }
        )
          .then(data => {
            console.log(data.data)
          })
      }

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
// MyRecipes.jsx
import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';

const MyRecipes = () => {
    const { user } = useContext(AuthContext)

    const [recipes, setRecipes] = useState([])

    useEffect(() => {

        axios.get(`${import.meta.env.VITE_API_URL}/recipes/${user.email}`, { withCredentials: true })
            .then(data => setRecipes(data?.data))
            .catch(err => console.log(err))

    }, [user])

    return (
        <div className='grid grid-cols-5 gap-5'>
            {recipes.map(recipe => <div key={recipe._id} className='border'>
                <img src={recipe.image} className='size-20' />
                <p>{recipe.title}</p>
            </div>
            )}
        </div>
    );
};

export default MyRecipes;
```


- Backend:

```
npm i cookie-parser
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

// JWT Middleware
const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token
    if (!token) return res.status(401).send({ message: "Not authenticated" })

    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "Token expired or invalid" })
        }
        req.decoded = decoded;
        next()
    })
}

async function run() {

    await client.connect();

    const recipesCollection = client.db("recipesDB").collection('recipes')

    app.post("/jwt", async (req, res) => {
        const email = req.body.email
        const token = jwt.sign({ email }, process.env.JWT_SECRET_KEY, { expiresIn: '7d' })

        res.cookie('token', token, {
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict' 
         })
        .send({ message: "JWT with cookie created" })
    })

    app.post('/jwt-logout', (req, res) => {
        res.clearCookie('token', { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict' 
        })
        .send({ message: 'JWT with cookie Logged out successfully' })
    })


    app.get('/recipes', async (req, res) => {
        const result = await recipesCollection.find({}).toArray();
        res.send(result);
    });

    app.get('/recipes/:email', verifyToken, async (req, res) => {
        const email = req.params.email

        if (req.decoded.email !== email) return res.status(403).send({ message: "Forbidden access" });

        const filter = { email }
        const result = await recipesCollection.find(filter).toArray();
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

```js
// env
MONGODB_URI = .......... 
PORT = ......
JWT_SECRET_KEY = ..................
require('crypto').randomBytes(64).toString('hex')
```

### With axios interceptor: 


- Frontend:

```js
// AuthProvider.jsx
import { auth } from '../firebase/firebase.init'
import { AuthContext } from './AuthContext'
import { useEffect, useState } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, } from 'firebase/auth'
import axios from 'axios'

const AuthProvider = ({ children }) => {
  const googleProvider = new GoogleAuthProvider()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const signInWithGoogle = () => {
    setLoading(true)
    return signInWithPopup(auth, googleProvider)
  }

  const logOut = () => {
    return axios.post(`${import.meta.env.VITE_API_URL}/jwt-logout`, {}, { withCredentials: true })
      .then(() => signOut(auth))
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser)

      if (currentUser?.email) {
        axios.post(`${import.meta.env.VITE_API_URL}/jwt`,
          { email: currentUser?.email },
          { withCredentials: true }
        )
          .then(data => {
            console.log(data.data)
          })
      }

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
// api/axiosSecure.js
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
// MyRecipes.jsx
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import axiosSecure from '../api/axiosSecure';

const MyRecipes = () => {
    const { user } = useContext(AuthContext)

    const [recipes, setRecipes] = useState([])

    useEffect(() => {

        axiosSecure.get(`/recipes/${user.email}`)
            .then(data => setRecipes(data?.data))
            .catch(err => console.log(err))

    }, [user])

    return (
        <div className='grid grid-cols-5 gap-5'>
            {recipes.map(recipe => <div key={recipe._id} className='border'>
                <img src={recipe.image} className='size-20' />
                <p>{recipe.title}</p>
            </div>
            )}
        </div>
    );
};

export default MyRecipes;
```


- Backend:

```
npm i cookie-parser
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

// JWT Middleware
const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token
    if (!token) return res.status(401).send({ message: "Not authenticated" })

    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "Token expired or invalid" })
        }
        req.decoded = decoded;
        next()
    })
}

async function run() {

    await client.connect();

    const recipesCollection = client.db("recipesDB").collection('recipes')

    app.post("/jwt", async (req, res) => {
        const email = req.body.email
        const token = jwt.sign({ email }, process.env.JWT_SECRET_KEY, { expiresIn: '7d' })

       res.cookie('token', token, {
         httpOnly: true, 
         secure: process.env.NODE_ENV === 'production',
         sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict' 
         })
        .send({ message: "JWT with cookie created" })
    })

    app.post('/jwt-logout', (req, res) => {
        res.clearCookie('token', { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict' 
        })
        .send({ message: 'JWT with cookie Logged out successfully' })
    })


    app.get('/recipes', async (req, res) => {
        const result = await recipesCollection.find({}).toArray();
        res.send(result);
    });

    app.get('/recipes/:email', verifyToken, async (req, res) => {
        const email = req.params.email

        if (req.decoded.email !== email) return res.status(403).send({ message: "Forbidden access" });

        const filter = { email }
        const result = await recipesCollection.find(filter).toArray();
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

```js
MONGODB_URI = .......... 
PORT = ......
JWT_SECRET_KEY = ..................
require('crypto').randomBytes(64).toString('hex')
```

# Authorization + Authorization with firebase:

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
// MyRecipes.jsx
import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';

const MyRecipes = () => {
    const { user } = useContext(AuthContext)

    const [recipes, setRecipes] = useState([])

    useEffect(() => {

        axios.get(`${import.meta.env.VITE_API_URL}/recipes/${user.email}`, {
            headers: {
                Authorization: `Bearer ${user?.accessToken}`
            }
        })
            .then(data => setRecipes(data?.data))
            .catch(err => console.log(err))

    }, [user])

    return (
        <div className='grid grid-cols-5 gap-5'>
            {recipes.map(recipe => <div key={recipe._id} className='border'>
                <img src={recipe.image} className='size-20' />
                <p>{recipe.title}</p>
            </div>
            )}
        </div>
    );
};

export default MyRecipes;
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
// index.js
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
app.use(cors())
app.use(express.json())

const client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// firebase Middleware
const verifyToken = async (req, res, next) => {
    const token = req?.headers?.authorization?.split(' ')[1]
    if (!token) return res.status(401).send({ message: "Not authenticated" })

    try {
        const decoded = await admin.auth().verifyIdToken(token)
        // const decoded = await getAuth().verifyIdToken(token) // if use use const { getAuth } = require("firebase-admin/auth")
        req.decoded = decoded;
        next()
    }
    catch (err) {
        return res.status(401).send({ message: "Token expired or invalid" })
    }
}

async function run() {

    await client.connect();

    const recipesCollection = client.db("recipesDB").collection('recipes')

    app.get('/recipes', async (req, res) => {
        const result = await recipesCollection.find({}).toArray();
        res.send(result);
    });

    app.get('/recipes/:email', verifyToken, async (req, res) => {
        const email = req.params.email

        if (req.decoded.email !== email) return res.status(403).send({ message: "Forbidden access" });

        const filter = { email }
        const result = await recipesCollection.find(filter).toArray();
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

here, for request interceptor: 
- `config` : the request object (URL, headers, method, etc.)


```jsx
// MyRecipes.jsx
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import axiosSecure from '../api/axiosSecure';

const MyRecipes = () => {
    const { user } = useContext(AuthContext)

    const [recipes, setRecipes] = useState([])

    useEffect(() => {

        axiosSecure.get(`/recipes/${user.email}`)
            .then(data => setRecipes(data?.data))
            .catch(err => console.log(err))

    }, [user])

    return (
        <div className='grid grid-cols-5 gap-5'>
            {recipes.map(recipe => <div key={recipe._id} className='border'>
                <img src={recipe.image} className='size-20' />
                <p>{recipe.title}</p>
            </div>
            )}
        </div>
    );
};

export default MyRecipes;
```

# Custom Authentication + Authorization with Cookies:

## Setup:

- step 1: Install all require packages:

```bash
npm init -y
```

```bash
npm i express pg dotenv bcryptjs jsonwebtoken cookie-parser
```

```bash
npm i -D typescript tsx
```

```bash
npm i -D @types/express @types/pg @types/node @types/jsonwebtoken @types/bcrypt @types/cookie-parser
```

```bash
tsc --init
```

- step 2: Modify tsconfig.json and package.json:

```json
// tsconfig.json
{
  // Visit https://aka.ms/tsconfig to read more about this file
  "compilerOptions": {
    // File Layout
    "rootDir": "./src", // un-comment it
    "outDir": "./dist", // un-comment it
    // Environment Settings
    // See also https://aka.ms/tsconfig/module
    "module": "nodenext",
    "target": "esnext",
    "types": [],
    // For nodejs:
    // "lib": ["esnext"],
    // "types": ["node"],
    // and npm install -D @types/node
    // Other Outputs
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    // Stricter Typechecking Options
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    // Style Options
    // "noImplicitReturns": true,
    // "noImplicitOverride": true,
    // "noUnusedLocals": true,
    // "noUnusedParameters": true,
    // "noFallthroughCasesInSwitch": true,
    // "noPropertyAccessFromIndexSignature": true,
    // Recommended Options
    "strict": true,
    // "jsx": "react-jsx", // comment it
    // "verbatimModuleSyntax": true, // comment it
    "isolatedModules": true,
    "noUncheckedSideEffectImports": true,
    "moduleDetection": "force",
    "skipLibCheck": true,
  }
}
```

```json
// package.json

{
  "name": "express-ts-postgress",
  "version": "1.0.0",
  "description": "",
  "main": "./src/server.ts", // add where our main server file exist
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
    "dotenv": "^17.4.1",
    "express": "^5.2.1",
    "pg": "^8.20.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.6",
    "@types/node": "^25.5.2",
    "@types/pg": "^8.20.0",
    "tsx": "^4.21.0",
    "typescript": "^6.0.2"
  }
}
```


## Example 1: 


```js
src/
│
├── config/
│ ├── db.ts 
│ └── env.ts 
│
├── modules/
│ └── product/
│ ├── product.controllers.ts 
│ ├── product.routes.ts 
│ ├── product.services.ts 
│ └── product.types.ts 
│ └── auth/
│ ├── auth.controllers.ts 
│ ├── auth.routes.ts 
│ ├── auth.services.ts 
│ └── auth.types.ts 
│ └── user/
│ ├── user.controllers.ts 
│ ├── user.routes.ts 
│ ├── user.services.ts 
│ └── user.types.ts 
│
├── app.ts 
└── server.ts
```


```ts
// src/config/db.ts
import { Pool } from "pg";
import config from "./env.js";

export const pool = new Pool({ connectionString: config.connection_str });

export const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users(
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    )`)
  await pool.query(`
  CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
  )
`);

};
```

```ts
// src/config/env.ts

import dotenv from "dotenv"
// import path from "path"


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
    jwt_access_secret: process.env.JWT_ACCESS_SECRET,
}

export default config
```

```ts
# .env

CONNECTION_STR=postgresql://neondb_owner:npg_CnF5zJxqcI2k@ep-soft-paper-ant6m8do-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
port=3000
JWT_ACCESS_SECRET=dfdjkfjdifj
```

```ts
// middlewares/auth.middleware.ts

import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken"
import config from "../config/env.js";

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.token;

        if (!token) throw new Error("Unauthorized");

        const decoded = jwt.verify(token, config.jwt_access_secret as string) as JwtPayload;

        req.user = decoded;

        next();
    } catch {
        return res.status(401).send({ message: "Unauthorized" });
    }
};

export default authMiddleware
```

```ts
// middlewares/role.middleware.ts
import { Request, Response, NextFunction } from "express";

const roleMiddleware = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).send({ message: "Forbidden" });
        }
        next();
    };
};

export default roleMiddleware;
```

```ts
// src/types/express/index.d.ts

import { JwtPayload } from "jsonwebtoken";

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}
```

```ts 
// src/utils/apiResponse.ts

export const apiResponse = {
    success(res: any, data: any, message = "OK") {
        return res.status(200).send({
            success: true,
            message,
            data
        });
    },

    created(res: any, data: any, message = "Created") {
        return res.status(201).send({
            success: true,
            message,
            data
        });
    },

    error(res: any, message = "Something went wrong", status = 500) {
        return res.status(status).send({
            success: false,
            message
        });
    }
};
```

- auth module

```ts
// src/modules/auth/auth.types.ts

export type CreateUser = {
    name: string;
    email: string;
    password: string;
    role: string
};

export type LoginUser = {
    email: string,
    password: string
}
```

```ts
// src/modules/auth/auth.services.ts

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../config/db.js";
import config from "../../config/env.js";
import { CreateUser, LoginUser } from "./auth.types.js";


export const authServices = {
    // create
    async register(data: CreateUser) {
        const { name, email, password, role } = data;

        const hashed = await bcrypt.hash(password, 10);

        const result = await pool.query(`
            INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *`,
            [name, email, hashed, role]
        );

        return result.rows[0];
    },

    // get
    async login(data: LoginUser) {
        const { email, password } = data;

        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (!user.rows.length) throw new Error("User not found");

        const isMatch = await bcrypt.compare(password, user.rows[0].password);

        if (!isMatch) throw new Error("Invalid credentials");


        const payload = {
            id: user.rows[0].id,
            role: user.rows[0].role,
            email: user.rows[0].email
        }

        const token = jwt.sign(payload, config.jwt_access_secret as string, { expiresIn: "7d" });

        const { password: _, ...safeUser } = user.rows[0];
        return { token, user: safeUser };
    }
};
```

```ts
// src/modules/auth/auth.controllers.ts

import { Request, Response } from "express";
import { authServices } from "./auth.services.js";
import { apiResponse } from "../../utils/apiResponse.js";

export const authControllers = {
    async register(req: Request, res: Response) {
        try {
            const user = await authServices.register(req.body);
            return apiResponse.created(res, user, "User registered");
        } catch (err: any) {
            return apiResponse.error(res, err.message);
        }
    },

    async login(req: Request, res: Response) {
        try {
            const { token, user } = await authServices.login(req.body);

            // we automatically set cookie when login
            res.cookie("token", token, {
                httpOnly: true,
                secure: false, // true in production (HTTPS)
                sameSite: "lax",
            });

            return apiResponse.success(res, user, "Login successful");
        } catch (err: any) {
            return apiResponse.error(res, err.message);
        }
    },

    async logout(req: Request, res: Response) {
        res.clearCookie("token");
        return apiResponse.success(res, null, "Logged out");
    }
};
```

```ts
// src/modules/auth/auth.routes.ts

import { Router } from "express";
import { authControllers } from "./auth.controllers.js";

const router = Router();

router.post("/register", authControllers.register);
router.post("/login", authControllers.login);
router.post("/logout", authControllers.logout);

export const authRoutes = router;
```

- user module: 

```ts
export type UpdateInput = {
    name?: string;
    email?: string;
    password?: string;
};
```

```ts
// src/modules/user/user.services.ts

import { pool } from "../../config/db.js"
import { UpdateInput } from "./user.types.js";
import bcrypt from "bcrypt";

export const userServices = {
    async findAll() {
        const result = pool.query("SELECT id, name, email, role FROM users");
        // const result = pool.query("SELECT * FROM users"); // we can't do it because password lick
        return result
    },

    async findOne(id: string) {
        const result = await pool.query("SELECT id, name, email, role FROM users WHERE id=$1", [id])
        return result
    },

    async updateRole(id: string, role: string) {
        return pool.query(
            "UPDATE users SET role=$1 WHERE id=$2 RETURNING *",
            [role, id]
        );
    },

    async update(id: string, data: UpdateInput) {
        const { name, email, password } = data;

        let hashedPassword = null;

        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        const result = await pool.query(
            `UPDATE users
             SET 
                name = COALESCE($1, name),
                email = COALESCE($2, email),
                password = COALESCE($3, password),
                updated_at = NOW()
             WHERE id = $4
             RETURNING id, name, email, role`,
            [
                name ?? null,
                email ?? null,
                hashedPassword,
                id
            ]
        );

        return result;
    },

    async delete(id: string) {
        return pool.query(
            "DELETE FROM users WHERE id=$1 RETURNING *",
            [id]
        );
    }
};
```

```ts
// src/modules/user/user.controllers.ts

import { Request, Response } from "express";
import { userServices } from "./user.services.js";
import { apiResponse } from "../../utils/apiResponse.js";

export const userControllers = {
    async getAllUsers(req: Request, res: Response) {
        try {
            const result = await userServices.findAll();
            return apiResponse.success(res, result.rows, "Users Fetched");
        } catch (err: any) {
            return apiResponse.error(res, err.message);
        }
    },

    async getUser(req: Request, res: Response) {
        try {
            const id = req.params.id as string
            const result = await userServices.findOne(id);
            return apiResponse.success(res, result.rows[0], "User fetched")
        } catch (err: any) {
            return apiResponse.error(res, err.message);
        }
    },

    async updateRole(req: Request, res: Response) {
        try {
            const id = req.params.id as string
            const { role } = req.body;
            const result = await userServices.updateRole(id, role);
            return apiResponse.success(res, result.rows[0], "Role updated");
        } catch (err: any) {
            return apiResponse.error(res, err.message);
        }
    },


    async updateUser(req: Request, res: Response) {
        try {
            const id = req.params.id as string;

            // 🔐 ownership check
            if (req.user?.id !== Number(id)) {
                return apiResponse.error(res, "You can only update your own account", 403);
            }

            const result = await userServices.update(id, req.body);

            return apiResponse.success(res, result.rows[0], "User updated");
        } catch (err: any) {
            return apiResponse.error(res, err.message);
        }
    },

    async deleteUser(req: Request, res: Response) {
        try {
            const id = req.params.id as string
            const result = await userServices.delete(id);
            return apiResponse.success(res, result.rows[0], "User deleted");
        } catch (err: any) {
            return apiResponse.error(res, err.message);
        }
    }
};
```

```ts
// src/modules/user/user.routes.ts

import { Router } from "express";
import { userControllers } from "./user.controllers.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import roleMiddleware from "../../middlewares/role.middleware.js";

const router = Router();

router.get("/", authMiddleware, roleMiddleware("admin"), userControllers.getAllUsers);
router.get("/:id", authMiddleware, userControllers.getUser)
router.patch("/:id", authMiddleware, userControllers.updateUser);
router.patch("/:id/role", authMiddleware, roleMiddleware("admin"), userControllers.updateRole);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), userControllers.deleteUser);

export const userRoutes = router;
```

- product module:

```ts
// src/modules/product/product.types.ts

export type CreateProduct = {
    name: string;
    price: number;
};

export type UpdateProduct = {
    name?: string;
    price?: number;
};
```

```ts
// // src/modules/product/product.services.ts

import { pool } from "../../config/db.js";
import { CreateProduct, UpdateProduct } from "./product.types.js";

export const productServices = {
    async create(data: CreateProduct, userId: number) {
        const { name, price } = data;

        const result = await pool.query(
            `INSERT INTO products (name, price, user_id)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [name, price, userId]
        );

        return result;
    },

    async findAll() {
        return await pool.query("SELECT * FROM products");
    },

    async findOne(id: string) {
        return await pool.query(
            "SELECT * FROM products WHERE id = $1",
            [id]
        );
    },

    async update(id: string, data: UpdateProduct, userId: number) {
        const { name, price } = data;

        return await pool.query(
            `UPDATE products 
             SET name = COALESCE($1, name),
                 price = COALESCE($2, price)
             WHERE id = $3 AND user_id = $4
             RETURNING *`,
            [name ?? null, price ?? null, id, userId]
        );
    },

    async delete(id: string, userId: number) {
        return await pool.query(
            `DELETE FROM products 
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [id, userId]
        );
    }
};
```

```ts
// src/modules/product/product.controllers.ts

import { Request, Response } from "express";
import { productServices } from "./product.services.js";
import { apiResponse } from "../../utils/apiResponse.js";

export const productControllers = {
    async create(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            const result = await productServices.create(req.body, userId);
            return apiResponse.created(res, result.rows[0], "Product created");
        } catch (err: any) {
            return apiResponse.error(res, err.message);
        }
    },

    async findAll(req: Request, res: Response) {
        const result = await productServices.findAll();
        return apiResponse.success(res, result.rows);
    },
    async findOne(req: Request, res: Response) {
        try {
            const result = await productServices.findOne(req.params.id as string);

            return apiResponse.success(res, result.rows[0], "Product fetched");
        } catch (err: any) {
            return apiResponse.error(res, err.message);
        }
    },

    async update(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            const result = await productServices.update(
                req.params.id as string,
                req.body,
                userId
            );
            return apiResponse.success(res, result.rows[0], "Updated");
        } catch (err: any) {
            return apiResponse.error(res, err.message);
        }
    },

    async delete(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            const result = await productServices.delete(req.params.id as string, userId);
            return apiResponse.success(res, result.rows[0], "Deleted");
        } catch (err: any) {
            return apiResponse.error(res, err.message);
        }
    }
};
```

```ts
// // src/modules/product/product.routes.ts

import { Router } from "express";
import { productControllers } from "./product.controllers.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import roleMiddleware from "../../middlewares/role.middleware.js";

const router = Router();

// anyone can see
router.get("/", productControllers.findAll);

// login user can see details
router.get("/:id", authMiddleware, productControllers.findOne);

// only seller & admin can create
router.post("/", authMiddleware, roleMiddleware("seller", "admin"), productControllers.create);

// only owner seller can update/delete
router.patch("/:id", authMiddleware, roleMiddleware("seller"), productControllers.update);

router.delete("/:id", authMiddleware, roleMiddleware("seller"), productControllers.delete);

export const productRoutes = router;
```


## Example 2: 

[click to see example](./assets/examples/express-postgresql-ts-1)

## Example 3: 

https://github.com/tamim-111/level-2-assignment-2