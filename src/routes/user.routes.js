import { Router } from "express";
import { registerUser } from "../controllers/user.controllers.js";
import {upload} from "../middlewares/multer.middlewares.js"

const router = Router()

router.route("/register").post(
    //Middleware
    upload.fields([                 // array takes multiple files in same field so we cant use it after upload hence we use fields which  Returns middleware that processes multiple files associated with the given form fields.
        {
            name: "avatar",     //this same name should be in the frontend while recieving files
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),    
    registerUser)   //after coming here from app.js--> here /register will be appended in url and it will call registerUser Method 


export default router;