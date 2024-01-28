import { Router } from "express";
import { loginUser, logoutUser, refreshAccessToken, registerUser } from "../controllers/user.controllers.js";
import {upload} from "../middlewares/multer.middlewares.js"
import { verifyJWT } from "../middlewares/auth.middlerwares.js";

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

router.route("/login").post(loginUser)

//secured Routes
router.route("/logout").post(verifyJWT,logoutUser)  //as we pass verifyJWT func before logoutUser. For this prupose we write next() at end of middleware so complier knows that it has run next function after middleware
router.route("/refresh-token").post(refreshAccessToken)

export default router; 