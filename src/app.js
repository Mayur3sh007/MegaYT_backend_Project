import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,    //this is just like a proxy
    credentials : true
}))   //we use app.use() when dealing with config or middleware


//We need these by default/globally
app.use(express.json({limit:"16kb"}))   //set limit of content fetched by express
app.use(express.urlencoded({extended:true,limit:"16kb"}))   // data in url is encoded so to fetch it we need to tell express  
app.use(express.static("public"))   //to store something like images etc   
app.use(cookieParser()) //to get safe cookies


//Routes import 
import userRouter from './routes/user.routes.js'

//routes declaration  ---> we usally used to use--> app.get() coz we were writing routes and controllers here in app.js itself. But as they are speprated we need to use middleware to get them here---> This is how it is.

app.use("/api/v1/users",userRouter)    //so whenever user types "/api/v1/users" we pass  "/api/v1/users" as a prefix to userRouter i.e in  user.routes.js
                                //So our url is like : http://localhost:8000/api/v1/users/register or login etc...

export {app}