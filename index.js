import express from 'express'
import cors from 'cors'
import { MongoClient } from 'mongodb'

const app = express()

// Configs
app.use(cors())
app.use(express.json)

// Connecting to Mongo
const mongoClient = new MongoClient("mongodb://localhost:27017")
let db;
let usersCollection;
let messagesCollection;

mongoClient.connect().then(() => {
    db = mongoClient.db("batepapoUol")

    // Repeated Variables
    usersCollection = db.collection("users")
    messagesCollection = db.collection("messages")
})

// API Code
app.post("/participants", (req, res) => {
    let name = req.body.name
    console.log(name)
    res.status(201).send("Seu lindo nome foi registrado com sucesso!")
})

app.listen(5000)