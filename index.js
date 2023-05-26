const express = require('express')
const cors = require('cors')
var jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

//middlewares
const corsConfig = {
  credentials:true,
  origin:true,
  methods: ["GET","POST","PATCH","PUT","DELETE","OPTIONS"]
}
app.use(cors(corsConfig));
app.use(express.json())

app.get('/', (req,res)=>{
    res.send("running beta........")
})

// mongodb



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.g4habg1.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyToken = (req,res,next) =>{
  const authorization = req.headers.authorization;
  
  if(!authorization){
    return res.status(401).send();
}
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.DB_SECRET_KEY, (err, decoded)=>{
  
  if(err){
      return res.send({error: true, message: 'unauthorized access'});
  }
  req.decoded = decoded;
  next()
  })

 
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const servicesCollection = client.db('car_doc').collection('services');
    const bookingCollection = client.db('car_doc').collection('booking');


    // jwt token 

    app.post('/jwt',(req,res) =>{
      const user = req.body;
      
// genteate token
      const token = jwt.sign(user,process.env.DB_SECRET_KEY, {expiresIn: "1h"})
      res.send({token})
    })

    app.get('/services', async(req,res) =>{
        const cursor = servicesCollection.find();
        const result = await cursor.toArray();
        res.send(result)
    })


    app.get('/services/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await servicesCollection.findOne(query);
      res.send(result)
    })

    app.post('/book', async(req,res) =>{
      
      const data = req.body;
      const result = await bookingCollection.insertOne(data);
      res.send(result)

    })

    app.get('/bookings', verifyToken, async(req,res) =>{
     
      
      let query ={}
      
      if(req.decoded?.email !== req.query.email){
        return res.status(401).send({error: true, message: 'unauthorized access'});
      }
    
      if(req.query?.email){
        query = {email: req.query.email}
      }

      const result = await bookingCollection.find(query).toArray();
      res.send(result)
    })

    app.delete('/bookings/:id', async(req,res) =>{
      const id = req.params.id;
      let query ={_id: new ObjectId(id)}

      const result = await bookingCollection.deleteOne(query);
      res.send(result)
    })

    app.patch('/bookings/:id', async(req,res)=>{
      const id = req.params.id;
      let query ={_id: new ObjectId(id)}
      const updatedBooking = req.body;

      const updatedDoc = {
        $set:{
          status: updatedBooking.status
        }
      }
      const result = await bookingCollection.updateOne(query,updatedDoc);
      res.send(result)
    })

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(err => console.log(err));


app.listen(port)