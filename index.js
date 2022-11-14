import express from 'express'
import cors from 'cors'
import { MongoClient, ObjectId } from 'mongodb'
import dayjs from 'dayjs'
import joi from 'joi'

const app = express()

// Configs
app.use(cors())
app.use(express.json())

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

// Schemas
const userSchema = joi.object({
    name: joi.string().required(),
    lastStatus: joi.number().required()
})

const messageSchema = joi.object({
    from: joi.string().required(), 
    to: joi.string().required(), 
    text: joi.string().required(),
    type: joi.string().required().valid("message", "private_message"),
    time: joi.string().required()
})

// API Code
app.post("/participants", async (req, res) => {
    let name = req.body.name
    let lastStatus = Date.now()
    let time = dayjs().format('HH:mm:ss')

    try {
        // User
        const user = { name, lastStatus }
        const validation = userSchema.validate(user, {abortEarly: false})
        const mongoUser = await usersCollection.findOne({name})
    
        if (validation.error) {
            const erros = validation.error.details.map((detail) => detail.message)
            return res.status(422).send(erros)
        }
    
        if (mongoUser) {
            return res.status(409).send("Esse nome já está sendo utilizado! Tente outro!")
        } else {
            usersCollection.insertOne(user)
        }
    
        // Message
        messagesCollection.insertOne({
            from: name, 
            to: 'Todos', 
            text: 'entra na sala...',
            type: 'status', 
            time
        })
    
        res.status(201).send("Seu lindo nome foi registrado com sucesso!")
    } catch (error) {
        res.sendStatus(500)
        console.log(error)
    }
})

app.get("/participants", async (req, res) => {
    try {
        const users = await usersCollection.find().toArray()
        res.send(users)        
    } catch (error) {
        res.sendStatus(500)
        console.log(error)
    }
})

app.post("/messages", async (req, res) => {
    const from = req.headers.user
    const {to, text, type} = req.body
    let time = dayjs().format('HH:mm:ss')
    const mountedMessage = { from, to, text, type, time }

    try {
        const validation = messageSchema.validate(mountedMessage, {abortEarly: false})
        const mongoUser = await usersCollection.findOne({from})

        if (validation.error) {
            const erros = validation.error.details.map((detail) => detail.message)
            return res.status(422).send(erros)
        }

        if (mongoUser) {
            console.log("Esse nome não está sendo utilizado!")
            return res.status(422).send("Esse usuário não está no servidor!")
        } else {
            messagesCollection.insertOne(mountedMessage)
            res.status(201).send("Mensagem enviada com sucesso!")
        }        
    } catch (error) {
        res.sendStatus(500)
        console.log(error)
    }
})

app.get("/messages", async (req, res) => {
    const { user } = req.headers
    let limit = req.query.limit

    try {
        const messages = await messagesCollection.find({ $or: [{type: "message"}, {to: "Todos"}, {to: user}, {from: user}] }).toArray()
        const slicedMessages = messages.slice(-limit)

        if (limit === undefined) {
            res.status(200).send(messages)
        } else {
            res.status(200).send(slicedMessages)
        }        
    } catch (error) {
        res.sendStatus(500)
        console.log(error)
    }
})

app.delete("/messages/:id", async (req, res) => {
    const { user } = req.headers
    const { id } = req.params

    try {
        const message = await messagesCollection.findOne({ _id: ObjectId(id)})

        if (!message) {
            return res.sendStatus(404)
        }

        if (user !== message.from){
            return res.sendStatus(401)
        }

        await messagesCollection.deleteOne(message)

    } catch (error) {
        console.log(error)
        res.sendStatus(500)
    }
})

app.post("/status", async (req, res) => {
    try {
        const name = req.headers.user
        if (!name) return res.status(422).send("O usuário não foi enviado, nem recebido!")

        const user = await usersCollection.findOne({name})
        if (!user) return res.status(404).send("O usuário não foi encontrado!")
        
        await usersCollection.updateOne(user, {$set: {lastStatus: Date.now()}})
        res.status(200).send("Usuário atualizado com sucesso!")
    } catch (error) {
        res.sendStatus(500)
        console.log(error)
    }
})

// Automatic Delete
setInterval(async () => {
    try {
        const users = await usersCollection.find().toArray()
        users.map(async user => {
            if ((user.lastStatus + 10000) < Date.now()) {
                let time = dayjs().format('HH:mm:ss')
                let id = user._id

                await usersCollection.deleteOne({ _id: ObjectId(id) })

                await messagesCollection.insertOne({
                    from: user.name, 
                    to: 'Todos', 
                    text: 'sai da sala...',
                    type: 'status', 
                    time
                })
            }
        })       
    } catch (error) {
        console.log(error)
    }
}, 15000)

app.listen(5000)