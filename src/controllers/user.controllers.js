import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary,deleteOnCloudinary} from  "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"
                                    
const generateAccessandRefreshTokens = async(userId)=>{   //not using asyncHAndler here as this is a function we gonna use inside loginUser only so no need to handle api errors
    try {
        const user = await User.findById(userId)

        if(!user)
        {
            throw new ApiError(404,"User not found");
        }
        // console.log("User",user)

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        // console.log("Tokens generated successfully:", { accessToken, refreshToken });
        
        user.refreshToken = refreshToken                //user has become an obj containing all properties we gave user in models. So we pass our generated refreshtoken to DB as a part of the data as seen in model
        await user.save({ validateBeforeSave: false })  //coz we havent put in password yet and we made password:required in model. So not to mess it up we mark validate:false
        
        return {accessToken, refreshToken}              //return to our loginUser method

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating Refresh and Access Tokens");
    }
}

const registerUser = asyncHandler(async (req,res) =>{   //wrap in asyncy handler as we have handled try catch there


                                            /* Steps for Register */     
    // get user details from Frontend 
    // Validation (Not empty)
    //Check if user already exists --> check with username,email
    //Check for imgs,avatar
    //Upload to cloudinary --> avatar
    //Create user obj --> create entry in DB
    //remove password and refresh token filed from response
    //check for user creation
    //return res

    const {fullName,email,username,password} = req.body         //The data recieved from forms,etc are in Body
    // console.log("email",email);

    // if(fullName === "")
    // {
    //     throw new ApiError(400,"fullName is Required")
    // }    --->can do this too but below code is advanced

    if(
        [fullName,email,username,password].some((field)=>String(field).trim() === "")       // The some method is an array method in JavaScript that tests whether at least one element in the array passes the provided function. trim is used to remove any leading or trailing whitespaces from the current field value.field.trim() === "" checks if the trimmed field value is an empty string.So, the condition inside some is checking if at least one of the fields has an empty
    ){
        throw new ApiError(400,"All fields are Required")
    }

    const existedUser = await User.findOne({  //1st occurance 
        $or: [ {username} , {email} ]        // retuns doc that matches the 1st occurance of the given username or email
    })

    if(existedUser){
        throw new ApiError(409,"User with same User name or email exists")
    }

    // console.log(req.files)

    //Checking images   --> as we had put multer(middleware) in user.routes then passed the control here we can use .files now instead of .body provided by Express which only gets data
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0 )
    {
        coverImageLocalPath = req.files.coverImage[0].path  //if it exists then from its 0th elem give me its path
    }

    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)   //put await even though we have asyncHandler coz we intentionnaly wanna make it wait here coz we knwo uploading takes time
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar)
    {
        throw new ApiError(400,"Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,      //we dont wanna send entire object(img) of avatar but just its url
        coverImage: coverImage?.url || "",  //we havent considered it as compulsory so we gotta check if it exists first then upload it
        email,
        password,
        username: String(username).toLowerCase()
    })  //except these mongoDB automatically adds ID to each "user"

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"                             //We add objs which we dont want in the select method. Coz we dont want user's password and refreshToken to be returned
    )

    if(!createdUser)    //not exists
    {
        throw new ApiError(500,"something went wrong while registering User")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Registered Successfully")
    )

})

const isUseralreadyLogged = asyncHandler(async (req,res) =>{

    try
    {
        // we have access to all cookies with req,res as we have used cookieparser middleware in app.js
        const token = req.cookies?.accessToken || req.header("Authorization") ?.replace("Bearer ","")    //coz we have cookies stored as-->Authorization:Bearer <token_name>.Since we just want token value we remove "Bearer "
    
        if(!token){
            throw new ApiError(401,"No Access Token found")
        }
    
        const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken._id).
        select("-password -refreshToken")
    
        if(!user){
            throw new ApiError(404,"Invalid Access token ")
        }
    
        return res
        .status(200)
        .json(
        new ApiResponse(
            200,
            req.user,
            "User logged in Successfully through Access token"
        )
    )    
        
    } catch (error) {
        throw new ApiError(404,"Access Token not found")
    }

})

const loginUser = asyncHandler(async(req,res)=>{

                                                /* Steps for Login */
    //req body ->data
    // username or email based
    // find user exists
    // password check
    // Acess and refresh tokens generate
    //send cookie

    const {email,username,password} = req.body
    
    if(!username && !email)  
    {
        throw new ApiError(400,"Username & Email is required")
    }

    const user = await User.findOne({   //user finds a value in DB based on either username or email
        $or: [{username},{email}]   
    })

    if(!user)
    {
        throw new ApiError(404,"User doesnt Exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)  // isPasswordCorrect we gt from user.models.js and the password we passed is from req.body

    if(!isPasswordValid)
    {
        throw new ApiError(401,"Invalid User Credentials")
    }

    const {accessToken,refreshToken} = await generateAccessandRefreshTokens(user._id)  //The method written at start of the file

    const loggedInUser = await User.findById(user._id).
    select("-password -refreshToken")

    const options = {   //we gotta create options for sending cookies
        httpOnly:true,  //so that its only visible & not editable
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User logged in Successfully"
        )
    )


})

const logoutUser = asyncHandler(async(req,res)=>{   //since we didnt have access to req.user here so we had to add middleware in user.routes.js

    await User.findByIdAndUpdate(
        req.user._id,   //Find by
        {
            $unset:{      //mongoDB operator which gives us an object where we can tell what to remove
                refreshToken: 1 //this removes the field from document
            }
        },
        {
            new:true        //so that when we return we have new updated value returned where theres no token
        },
    )

    //now for cookies
    const options = {   //we gotta create options for sending cookies
        httpOnly:true,  //so that its only visible & not editable
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged OUT"))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken  //This is the one user sending us (we also take from body coz apps dont have cookies)

    if(!incomingRefreshToken)   
    {
        throw new ApiError(401,"Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,               //This token we get is encoded
            process.env.REFRESH_TOKEN_SECRET    //So we decode it with our secret
        )
        
        const user = await User.findById(decodedToken?._id)   //And get user from mongoDB using it
    
        if(!user)    //*********** */
        {
            throw new ApiError(401,"Invalid Refresh Token")
        }

        if(incomingRefreshToken !== user?.refreshToken)
        {
            throw new ApiError(401,"Refresh token is expried or being Used")
        }
    
        const options = {
            httpOnly:true,
            secure:true
        }
    
        const {accessToken,newRefreshToken} = await generateAccessandRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("Access Token", accessToken, options)
        .cookie("Refresh Token", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken : newRefreshToken},
                "Access Token Refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid Refresh Token")
    }

})

const changeCurrentPassword = asyncHandler(async(req,res)=>{

    const {oldPassword,newPassword} = req.body

    const user = await User.findById(req.user?._id)  //so if the user is changing password that means he's logged in i.e auth.controller has been run hence we can use req.user as our user is saved due to that middleware
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect)
    {
        throw new ApiError(400,"Invalid old Password")
    }

    user.password =  newPassword
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    
    //My attempt to write this func 
    // const user = await User.findById(req.user?.id)
    // if(!user)
    // {
    //     throw new ApiError(404,"User not logged in")
    // }
    //return res
    // .status(200)
    // .json(200,user,"Current user fetched successfully")

    //So if user is logged in then our auth middleware is called so we have acess to req.user
    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"Current user fetched successfully"))

})

//Updation Methods
const updateAccountDetails = asyncHandler(async(req,res)=>{
    //remember always keep updating user details(text) and files methods different it prevents saturation on server
    const {fullName, email} = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {             //its a method to set the input
                fullName,       //this is fine
                email: email    //this is also fine
            }
        },
        {new: true} //so we return newly updated values
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req,res)=>{

    //Since while registering we created a user in mongo DB and put avatar: avatar.url i.e avatar in DB now contains our Og cloudinary url of avatar 
    //hence we gonna delete it first

    //Dont do this coz it will return us an object
    // const oldCloudinarycoverImageURL = await User.findById(req.user?._id).select('avatar');   //get old cloudinary url from DB

    // if(!oldCloudinarycoverImageURL)
    // {
    //     throw new ApiError(404,"Old avatar url for cloudinary not found");
    // }

    //This will specifically return just url
    const oldCloudinarycoverImageURL = req.user.avatar;
    console.log(oldCloudinarycoverImageURL)

    // Delete old avatar from Cloudinary
    const deletionResult = await deleteOnCloudinary(oldCloudinarycoverImageURL);

    if (deletionResult == false) {
        throw new ApiError(500, "Error deleting old avatar from Cloudinary");
    }

    //now we got access to req.files coz we have imported multer middleware in routes B4 executing this func
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avatar file missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)    

    if(!avatar.url)
    {
        throw new ApiError(400,"Error while uploading avatarLocalPath on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Avatar updated Successfully")
    )

})

const updateUserCoverImage = asyncHandler(async(req,res)=>{

    //This will specifically return just url
    const oldCloudinarycoverImageURL = req.user.coverImage;
    console.log(oldCloudinarycoverImageURL)

    // Delete old avatar from Cloudinary
    const deletionResult = await deleteOnCloudinary(oldCloudinarycoverImageURL);

    if (deletionResult == false) {
        throw new ApiError(500, "Error deleting old avatar from Cloudinary");
    }

    //now we got access to req.files coz we have imported multer middleware in routes B4 executing this func
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath)
    {
        throw new ApiError(400,"Cover Image file is missing in local")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url)
    {
        throw new ApiError(400,"Error while uploading coverImageLocalPath on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")


    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Cover Image updated Successfully")
    )
})

//Aggregation Pipeline
const getUserChannelProfile = asyncHandler(async(req,res)=>{

    const {username} = req.params   //we get username from url , hence req.params

    if(!username?.trim())   //trim to check for empty string
    {
        throw new ApiError(400,"Username is Missing");
    }

    //to check what we getting
    // const user = await User.findOne({username});
    // console.log(user);

    const channel = await User.aggregate([  //aggregate returns an array
        {
            $match:{
                username: username?.toLowerCase()   //checks whether the username field in our DB and the one we recieved turned into lowercase matches
            }
        },
        {
            $lookup:{                     //We find how many times a channel is registered in DB to count its subscribers
                from:"subscriptions",    // we gave model name as "Subscription" in models but in DB it becomes lowercase and plural
                localField:"_id",       //this from here
                foreignField:"channel", //we get from subscriptions
                as:"subscribers"
            }
        },
        {
            $lookup:{                   //We find a subscriber to get what channels he has subscribed to
                from:"subscriptions",   
                localField:"_id",
                foreignField:"subsciber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscriberCount:{
                    $size: "$subscribers"   //new generated field
                },
                channelSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond: {
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]}, //Basically see if our user exists as a "subscriber"(our given name in model) in our new generated field named "subscribers" which we just got above.
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{          //Allows us to chose what to show and what not to
                fullName:1,     //1 means its flag is on i.e it will be projected
                username:1,
                email:1,
                subscriberCount:1,
                channelSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
            }
        }
    ])

    console.log(channel)

    if(!channel?.length){
        throw new ApiError(404,"Channel Not found");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"User channel fetched Successfully")
    )
})

const getWatchHistory = asyncHandler(async(req,res)=>{

    const user = await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)   //bcoz as we know "req.user._id" gives us a string of ID and normally its converted to mongoDB object ID behind the scenes by mongoose but as we are in aggregate method , It doesnt work that way so we have to manually do it 
            }
        },
        {
            $lookup:{                   //now we have fetched a big doc
                from:"videos",
                localField:"watchHistory",  //from users
                foreignField:"_id",         //from videos 
                as:"watchHistory",          //now contains ids of videos
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",      //from videos coz we are inside videos now
                            foreignField:"_id",     //from users
                            as:"owner",             //now this contains all owners
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        },
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch History Fetched Successfully"
            )
    )
})

export 
{
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    isUseralreadyLogged,         //* Own Method  */
    getUserChannelProfile,
    getWatchHistory
}