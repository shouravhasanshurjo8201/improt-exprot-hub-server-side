const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.User_Name}:${process.env.MongoPassword}@cluster0.nivae1g.mongodb.net/?appName=Cluster0`;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

app.get('/', (req, res) => {
    res.send('Hello World')
})

async function run() {
    try {
        await client.connect();
        const ImportExportDB = client.db("ImportExportDB");
        const myColl = ImportExportDB.collection("AllProducts");
        app.get('/Products', async (req, res) => {
            const cursor = myColl.find();
            const allData = await cursor.toArray();
            res.send(allData)
        })

        app.get('/Products/latest', async (req, res) => {
            try {
                const cursor = myColl.find().sort({ _id: -1 }).limit(6);
                const latestProducts = await cursor.toArray();
                res.send(latestProducts);
            } catch (error) {
                console.error("Error fetching latest products:", error);
                res.status(500).send({ success: false, message: "Server error" });
            }
        });

        app.get('/Products/id/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await myColl.findOne(query);
            res.send(result);
        })

        app.get('/Products/ExporterEmail/:email', async (req, res) => {
            const email = req.params.email;
            const query = { Exporter_Email: email };
            const result = await myColl.find(query).toArray();
            res.send(result);
        });

        app.get('/Products/ImporterEmail/:email', async (req, res) => {
            const email = req.params.email;
            const query = { Importer_Email: email };
            const result = await myColl.find(query).toArray();
            res.send(result);
        });




        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
