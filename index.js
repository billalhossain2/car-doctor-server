const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cookieParser = require('cookie-parser')
const env = require("dotenv");
env.config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 9000;

const app = express();

//Middlewares
app.use(express.json());
app.use(cors({
  origin:['https://car-doctor-244f4.web.app', 'https://car-doctor-244f4.firebaseapp.com'],
  credentials:true
}));
app.use(cookieParser())

app.get("/", (req, res) => {
  res.send(`Server is running on port ${port}`);
});


const verifyToken = (req, res, next)=>{
  const token = req.cookies.token;
  if(!token){
    return res.status(401).json({code:401, message:'Unauthorized access!'})
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded)=>{
    if(err){
      return res.status(403).send({code:403, message:'Access Forbidden!'})
    }

    req.email = decoded.email
    next()
  })
}




const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

/*==============================Custom Middleware==========================*/


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
    const productsCollection = client.db("carDoctorDB").collection("products");
    const servicesCollection = client.db("carDoctorDB").collection("services");
    const bookingCollection = client.db("carDoctorDB").collection("bookings");

    /*============================JWT Route====================================*/
    app.post('/jwt', (req, res)=>{
      try {
        const user = req.body;
        const token = jwt.sign(user, process.env.JWT_SECRET_KEY, {expiresIn:'1h'})
        res
        .cookie('token', token, {httpOnly:true, secure:true, sameSite:'none'})//for https products
        .status(200).send({token:token})
      } catch (error) {
        res.status(404).json({error:true, message:'There was internal server error'})
      }
    })


    app.post("/logout", (req, res)=>{
      const user = req.body;
      console.log("logged out user: ", user)
      res
      .clearCookie('token', {maxAge:0})
      .send({success:true})
    })








    // service routes
    app.post("/services", async (req, res) => {
      const service = req.body;
      const result = await servicesCollection.insertOne(service);
      res.send(result);
    });

    app.get("/services", async (req, res) => {
      const result = await servicesCollection.find().toArray();
      res.send(result);
    });

    app.get("/services/:serviceId", async (req, res) => {
      const serviceId = req.params.serviceId;
      const query = { _id: new ObjectId(serviceId) };
      const options = { projection: { _id: 0, title: 1, img: 1, price: 1 } };
      const result = await servicesCollection.findOne(query, options);
      res.send(result);
    });

    //products routes
    app.get("/products", async (req, res) => {
      const result = await productsCollection.find().toArray();
      res.send(result);
    });

    //Booking Routes
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    /*=====================Protected Route=============================*/
    app.get("/bookings", verifyToken, async (req, res) => {
      const query = req.query;
      if(req.email === query.email){
        const result = await bookingCollection.find(query).toArray();
        res.send(result);
      }
    });

    //delete booked
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedField = req.body;
      const updateDoc = {
        $set: updatedField,
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
