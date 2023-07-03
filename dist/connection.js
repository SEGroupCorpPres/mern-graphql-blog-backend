"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDataBase = void 0;
const mongoose_1 = require("mongoose");
// import {config} from "dotenv";
//
// config();
const connectToDataBase = async () => {
    try {
        await (0, mongoose_1.connect)(`mongodb+srv://artessdu:${process.env.MONGODB_PASSWORD}@cluster0.o8gb9an.mongodb.net/?retryWrites=true&w=majority`);
        console.log("Connected to MongoDB");
    }
    catch (e) {
        console.log(e);
        return e;
    }
};
exports.connectToDataBase = connectToDataBase;
//# sourceMappingURL=connection.js.map