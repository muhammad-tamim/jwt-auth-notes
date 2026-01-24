<h1 align="center">JWT Authorization Notes</h1>

- [Introduction:](#introduction)
- [setup:](#setup)
- [Different ways to use JWT:](#different-ways-to-use-jwt)
    - [Using localStorage:](#using-localstorage)
    - [Using cookies:](#using-cookies)
    - [Using firebase:](#using-firebase)


# Introduction: 
JWT stands for JSON Web Token. We used JWT for secure our api. 

# setup:

Install it to backend: 

```bash
npm i jsonwebtoken
``` 

# Different ways to use JWT:

### Using localStorage: 

- Frontend:

```js
// AuthProvider.jsx
import { auth } from '../firebase/firebase.init'
import { AuthContext } from './AuthContext'
import { useEffect, useState } from 'react'

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import axios from 'axios'

const AuthProvider = ({ children }) => {
  const googleProvider = new GoogleAuthProvider()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)


  console.log(loading, user)

  const createUser = (email, password) => {
    setLoading(true)
    return createUserWithEmailAndPassword(auth, email, password)
  }

  const signIn = (email, password) => {
    setLoading(true)
    return signInWithEmailAndPassword(auth, email, password)
  }

  const signInWithGoogle = () => {
    setLoading(true)
    return signInWithPopup(auth, googleProvider)
  }

  const updateUser = updatedData => {
    return updateProfile(auth.currentUser, updatedData)
  }

// ------------JWT With Local Storage-----------------
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

// --------------------------------------------------

  const authData = {
    user,
    setUser,
    createUser,
    logOut,
    signIn,
    signInWithGoogle,
    loading,
    setLoading,
    updateUser,
  }
  return <AuthContext value={authData}>{children}</AuthContext>
}

export default AuthProvider
```

```js
// MyOrders.jsx
import axios from 'axios'
import { use } from 'react'
import { useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import OrderCard from './OrderCard'

const MyOrders = () => {
    const { user } = use(AuthContext)
    const [orders, setOrders] = useState([])
    useEffect(() => {
        // -------------JWT with local storage----------------
        axios(`${import.meta.env.VITE_API_URL}/my-orders/${user?.email}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        })
        // ---------------------------------------------------
            .then(data => {
                console.log(data?.data)
                setOrders(data?.data)
            })
            .catch(err => {
                console.log(err)
            })
    }, [user])
    return (
        <div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6 py-12'>
                {/* Coffee Cards */}
                {orders.map(coffee => (
                    <OrderCard key={coffee._id} coffee={coffee} />
                ))}
            </div>
        </div>
    )
}

export default MyOrders
```

- Backend: 

```js
// index.js
const express = require('express')
const cors = require('cors') 
const jwt = require('jsonwebtoken') // JWT with local storage
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

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


// -------------JWT with local storage middle ware---------
const verifyJwt = (req, res, next) => {
    const token = req?.headers?.authorization?.split(' ')[1]
    if (!token) return res.status(401).send({ message: "Unauthorized assess" })

    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "Unauthorized assess" })
        }
        req.tokenEmail = decoded.email
        next()
    })
}
// --------------------------------------------------------

async function run() {
    await client.connect();

    const coffeesCollection = client.db("coffeesDB").collection('coffees')
    const ordersCollection = client.db("coffeesDB").collection('orders')


    // ---------JWT with local storage-----------
    app.post("/jwt", async (req, res) => {
        const email = req.body.email
        const token = jwt.sign({ email }, process.env.JWT_SECRET_KEY, { expiresIn: '7d' })
        res.send({ token })
    })
    // -----------------------------------------


    app.get('/my-orders/:email', verifyJwt, async (req, res) => {

        // --------------JWT with local storage----------
        const decodedEmail = req.tokenEmail
        const email = req.params.email

        if (decodedEmail !== email) {
            return res.status(403).send({ message: "Forbidden assess" })
        }
        // ----------------------------

        const filter = { customerEmail: email }
        const allOrders = await ordersCollection.find(filter).toArray()

        for (const order of allOrders) {
            const orderId = order.coffeeId
            const filter = { _id: new ObjectId(orderId) }
            const fullCoffeeData = await coffeesCollection.findOne(filter)
            order.name = fullCoffeeData.name
            order.photo = fullCoffeeData.photo
            order.price = fullCoffeeData.price
            order.quantity = fullCoffeeData.quantity
        }

        res.send(allOrders)
    })

    // Send a ping to confirm a successful connection
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
MONGODB_URI = 
PORT = 
JWT_SECRET_KEY = require('crypto').randomBytes(64).toString('hex')
```

### Using cookies: 
### Using firebase: