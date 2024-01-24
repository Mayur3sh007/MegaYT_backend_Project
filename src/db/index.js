import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async()=>{
    try {

        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\n MongoDB connected sucessfully!!! DB HOST: ${connectionInstance}`);

    } catch (error) {
        console.log("MongoDB connection FAILED || src/db/index.js ");
        process.exit(1);    //these 123... are codes providided with process provided by node ( read node documentation to explore)
    }
}

export default connectDB;