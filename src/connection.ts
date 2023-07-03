import {connect} from "mongoose";
// import {config} from "dotenv";
//
// config();
export const connectToDataBase = async () => {
    try {
        await connect(`mongodb+srv://artessdu:${process.env.MONGODB_PASSWORD}@cluster0.o8gb9an.mongodb.net/?retryWrites=true&w=majority`);
        console.log("Connected to MongoDB");
    } catch (e) {
        console.log(e);
        return e;
    }
}