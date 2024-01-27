import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import jwt from "json-web-token"
import {User} from "../models/user.model.js"

export const verifyJWT = asyncHandler(async(req,_,next)=>{  //since here was no need for res we use "_"
    try {
        // we have access to all cookies with req,res as we have used cookieparser middleware in app.js
        const token = req.cookies?.accessToken || req.header("Authorization") ?.replace("Bearer ","")    //coz we have cookies stored as-->Authorization:Bearer <token_name>.Since we just want token value we remove "Bearer "
    
        if(!token){
            throw new ApiError(401,"Unauthorized Request")
        }
    
        const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken._id).
        select("-password -refreshToken")
    
        if(!user){
            throw new ApiError(401,"Invalid Access Token")
        }
    
        //Until now its confirmed that we have a user with accessToken i.e loggedIn
        req.user = user;    //Now we gave our identified user to the reqBody i.e the part of Body named "user" in model
        next()  //pass the control to anything next
    } catch (error) {
        throw new ApiError(401,"Invalid Access Token")
    }

})