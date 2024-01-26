import {asyncHandler} from "../utils/asyncHandler.js"

const registerUser = asyncHandler(async (req,res) =>{   //wrap in asyncy handler as we have handled try catch there
    res.status(200).json({
        message:"Sup Nigga"
    })
} )

export {registerUser}