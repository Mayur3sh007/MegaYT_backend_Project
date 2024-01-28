import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from  "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
                                    
const generateAccessandRefreshTokens = async(userId)=>{   //not using asyncHAndler here as this is a function we gonna use inside loginUser only so no need to handle api errors
    try {
        const user = await User.findById(userId)

        if(!user)
        {
            throw new ApiError(404,"User not found");
        }
        console.log("User",user)

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

} )

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
            $set:{      //mongoDB operator which gives us an object where we can tell what to update
                refreshToken: undefined
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

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken  //This is the one user sending us

    if(!incomingRefreshToken)   
    {
        throw new ApiError(401,"Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,               //This token we get is encoded
            process.env.REFRESH_TOKEN_SECRET    //So we decode it with our secret
        )
    
        const user = User.findById(decodedToken?._id)   //And get user using it
    
        if(!user)    //*********** */
        {
            throw new ApiError(401,"Invalid Refresh Token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh token is expried or Used")
        }
    
        const options = {
            httpOnly:true,
            secure:true
        }
    
        const {accessToken,newRefreshToken} = await generateAccessandRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("Access Token",accessToken)
        .cookie("Refresh Token",newRefreshToken)
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

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}