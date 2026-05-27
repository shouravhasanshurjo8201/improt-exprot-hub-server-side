const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.User_Name}:${process.env.MongoPassword}@cluster0.nivae1g.mongodb.net/?appName=Cluster0`;
const app = express();
const port = process.env.PORT || 3000;
require('dotenv').config();

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
    res.send('Server is running successfully')
})

async function run() {
    try {
        const ImportExportDB = client.db("ImportExportDB");
        const myColl = ImportExportDB.collection("AllProducts");
        const usersColl = ImportExportDB.collection("users");

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
            const result = await myColl.find(query).sort({ _id: -1 }).toArray();
            res.send(result);
        });

        app.post('/Products', async (req, res) => {
            console.log("Import Data log", req.body)
            const importData = req.body
            const result = await myColl.insertOne(importData);
            res.send(result);
        })
        app.delete('/Products/Delete/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await myColl.deleteOne(query);

                if (result.deletedCount === 1) {
                    res.send({ deletedCount: result.deletedCount, success: true, message: "Product deleted successfully" });
                } else {
                    res.status(404).send({ success: false, message: "Product not found" });
                }
            } catch (error) {
                res.status(500).send({ success: false, message: "Invalid ID or server error" });
            }
        });

        app.patch('/Products/Patch/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const { importQuantity, importerEmail } = req.body;

                const query = { _id: new ObjectId(id) };
                const updateDoc = {
                    $inc: { AvailableQuantity: -importQuantity },
                    $set: { Importer_Email: importerEmail }
                };

                const result = await myColl.updateOne(query, updateDoc);
                if (result.matchedCount === 0) {
                    res.status(404).send({ success: false, message: "Product not found" });
                } else {
                    res.send({ success: true, message: "Product updated successfully" });
                }
            } catch (error) {
                console.error("Update Error:", error);
                res.status(500).send({ success: false, message: "Server Error" });
            }
        });

        app.put('/Products/Put/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const updatedData = req.body;
                const query = { _id: new ObjectId(id) };

                const updateDoc = {
                    $set: {
                        ProductName: updatedData.ProductName,
                        ProductImage: updatedData.ProductImage,
                        Price: updatedData.Price,
                        OriginCountry: updatedData.OriginCountry,
                        Rating: updatedData.Rating,
                        AvailableQuantity: updatedData.AvailableQuantity,
                    },
                };

                const result = await myColl.updateOne(query, updateDoc);

                if (result.matchedCount) {
                    res.send({
                        success: true,
                        modifiedCount: result.modifiedCount,
                        message: "Product updated successfully",
                    });
                } else {
                    res.status(404).send({ success: false, message: "Product not found" });
                }
            } catch (error) {
                console.error("Update Error:", error);
                res.status(500).send({ success: false, message: "Server Error" });
            }
        });

        app.post('/login-user', async (req, res) => {
            try {
                const userData = req.body;
                if (!userData?.email) {
                    return res.status(400).send({ message: 'Email required' });
                }

                const query = { email: userData.email };
                const alreadyExists = await usersColl.findOne(query);

                if (alreadyExists) {
                    const updateDoc = {
                        $set: {
                            last_loggedIn: new Date().toISOString(),
                            name: userData.name || alreadyExists.name,
                            photoURL: userData.photoURL || alreadyExists.photoURL,
                        }
                    };
                    const result = await usersColl.updateOne(query, updateDoc);
                    res.send({ message: 'User updated', result });
                } else {
                    userData.created_at = new Date().toISOString();
                    userData.last_loggedIn = new Date().toISOString();
                    userData.role = "user";

                    const result = await usersColl.insertOne(userData);
                    res.send({ message: 'User created', result });
                }

            } catch (error) {
                console.error(error);
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });

        app.get('/users', async (req, res) => {
            const result = await usersColl.find().toArray();
            res.send(result);
        });

        app.get('/users/:email', async (req, res) => {
            try {
                const email = req.params.email;
                const user = await usersColl.findOne({ email });

                if (!user) {
                    return res.status(404).send({ message: "User not found", role: "user" });
                }

                res.send(user);
            } catch (error) {
                res.status(500).send({ message: "Server error" });
            }
        });

        app.get('/users/role/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersColl.findOne(
                { email },
                { projection: { role: 1 } }
            );

            res.send({ role: user?.role || "user" });
        });

        app.patch('/users/role/:id', async (req, res) => {
            const id = req.params.id;
            const { role } = req.body;

            const result = await usersColl.updateOne(
                { _id: new ObjectId(id) },
                { $set: { role } }
            );

            res.send(result);
        });

        app.patch('/users/profile/:email', async (req, res) => {
            const email = req.params.email;
            const { displayName, photoURL, phoneNumber, jobTitle, bio } = req.body;

            const query = { email: email };
            const updatedDoc = {
                $set: {
                    name: displayName,
                    photoURL,
                    phoneNumber,
                    jobTitle,
                    bio
                }
            };

            try {
                const result = await usersColl.updateOne(query, updatedDoc);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to update profile" });
            }
        });

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally { }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})