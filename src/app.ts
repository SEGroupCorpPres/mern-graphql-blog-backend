import express from 'express';
import {config} from "dotenv";
import {connectToDataBase} from "./connection";
import {graphqlHTTP} from "express-graphql";
import cors from "cors";
import  schema from "./handlers/handlers";

// Dotenv configuration

config();

const app = express();
app.use(cors());
app.use("/graphql", graphqlHTTP({schema: schema, graphiql: false}));

connectToDataBase().then(() => {
    app.listen(process.env.PORT, () => console.log('listening on port ' + process.env.PORT));
}).catch((e) => console.log(e));


