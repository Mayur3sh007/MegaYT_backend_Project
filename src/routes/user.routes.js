import { Router } from "express";
import {
    changeCurrentPassword,
    getCurrentUser,
    getUserChannelProfile,
    getWatchHistory,
    isUseralreadyLogged,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
} from "../controllers/user.controllers.js";
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

router.route("/verify").get(isUseralreadyLogged)
router.route("/login").post(loginUser)

//secured Routes
router.route("/logout").post(verifyJWT,logoutUser)  //as we pass verifyJWT func before logoutUser. For this prupose we write next() at end of middleware so complier knows that it has run next function after middleware
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT,changeCurrentPassword)
router.route("/current-user").get(verifyJWT,getCurrentUser)
router.route("/update-account").patch(verifyJWT,updateAccountDetails)   //patch means change only a part of resource

router.route("/changeAvatar").patch(verifyJWT,upload.single("newAvatar"),updateUserAvatar)    //basically our user must be firstly loggedin and then we want upload method from multer but only for a single file named "avatar"--> this is the name we gave now  but still for safety keep it same as the ones we are using in Db and code. Then call our main method
router.route("/change-Cover-image").patch(verifyJWT,upload.single("newCoverImage"),updateUserCoverImage)

//while taking something from params we MUST NOT change the naming convention. Keep it the same as the one we gave in the method in controllers
router.route("/channel/:username").get(verifyJWT,getUserChannelProfile) //since we took "username" in controllers we must keep it same here too
router.route("/history").get(verifyJWT,getWatchHistory)

export default router; 