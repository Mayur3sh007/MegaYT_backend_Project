import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from  "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

    // get user details from Frontend
    //Validation (Not empty)
    //Check if user already exists --> check with username,email
    //Check for imgs,avatar
    //Upload to cloudinary --> avatar
    //Create user obj --> create entry in DB
    //remove password and refresh token filed from response
    //check for user creation
    //return res

const registerUser = asyncHandler(async (req,res) =>{   //wrap in asyncy handler as we have handled try catch there

    const {fullName,email,username,password} = req.body         //The data recieved from forms,etc are in Body
    console.log("email",email);

    // if(fullName === "")
    // {
    //     throw new ApiError(400,"fullName is Required")
    // }    --->can do this too but below code is advanced

    if(
        [fullName,email,username,password].some((field)=>field.trim() === "")       // The some method is an array method in JavaScript that tests whether at least one element in the array passes the provided function. trim is used to remove any leading or trailing whitespaces from the current field value.field.trim() === "" checks if the trimmed field value is an empty string.So, the condition inside some is checking if at least one of the fields has an empty
    ){
        throw new ApiError(400,"All fields are Required")
    }

    const existedUser = User.findOne({  //1st occurance 
        $or: [ {username} , {email} ]        // retuns doc that matches the 1st occurance of the given username or email
    })

    if(existedUser){
        throw new ApiError(409,"User with same User name or email exists")
    }

    //Checking images   --> as we had put multer(middleware) in user.routes then passed the control here we can use .files now instead of .body provided by Express which only gets data
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImagePath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)   //put await even though we have asyncHandler coz we intentionnaly wanna make it wait here coz we knwo uploading takes time
    const coverImage = await uploadOnCloudinary(coverImagePath)

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
        username: username.toLowerCase()
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

export {registerUser}