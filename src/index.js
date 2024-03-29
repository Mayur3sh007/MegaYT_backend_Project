//require('dotenv').config({path:'./env'})      //with this no need to config dotenv or change start script---> but it looks like shit
import 'dotenv/config'
import connectDB from "./db/index.js";
import { app } from './app.js';

connectDB()
.then(()=>{

    app.on("Error",(error)=>{           //on starting app if theres error
        console.log("ERROR while connecting DB --> src/index.js",error)
        
    })
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`Server is running at port:  ${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log("MongoDB connection failed --> src/index.js !!! ",err)
})




























/*      This is also a good approach but we have a better(PRO) approach so we go to index.js in db folder 
import  express  from "express";
const app = express();

//IFEE
;(async()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("Error",(error)=>{
            console.log("ERROR:",error)
            throw error
        })
 
        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on port ${process.env.PORT}`);
        })

    } catch (error) {
        console.log("ERROR",error)
    }
})()
*/