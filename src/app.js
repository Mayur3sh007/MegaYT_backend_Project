import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,    //this is just like a proxy
    credentials : true
}))   //we use app.use() when dealing with config or middleware

app.use(express.json({limit:"16kb"}))   //set limit of content fetched by express
app.use(express.urlencoded({extended:true,limit:"16kb"}))   // data in url is encoded so to fetch it we need to tell express  
app.use(express.static("public"))   //to store something like images etc   
app.use(cookieParser()) //to get safe cookies


export {app}