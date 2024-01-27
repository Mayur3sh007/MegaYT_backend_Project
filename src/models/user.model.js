import mongoose, {Schema} from "mongoose";
import jwt from "json-web-token";
import bcrypt from "bcrypt"

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true, 
            index: true //Whenever we wanna easily search for an obj based on this attribute we make index:true --> but impacts performance so its chosen wisely
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowecase: true,
            trim: true, 
        },
        fullName: {
            type: String,
            required: true,
            trim: true, 
            index: true
        },
        avatar: {
            type: String, // cloudinary url
            required: true,
        },
        coverImage: {
            type: String, // cloudinary url
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,    //we do this whenever we wanna take a ref 
                ref: "Video"
            }
        ],
        password: {
            type: String,
            required: [true, 'Password is required']
        },
        refreshToken: {
            type: String
        }
    },
    {timestamps: true}    //createdAt and UpdatedAt are added
)

//This pre is a middleware from node read documentation to see its events

userSchema.pre("save",async function(next) {    //This means that before we "save" any data encrypt the password

    if(!this.isModified("password")) return next();     //if our password hasnt been modified then dont do anything. (like we changing our avatar or something then there's no need to encrpty pwd)

    this.password = await bcrypt.hash(this.password,10)  //10 are hash rounds
    next() //pass the flag to next func
})  

userSchema.methods.isPasswordCorrect = async function(password)
{
    return await bcrypt.compare(password, this.password)            //bcrypt can also check hashed pwds --> returns true/false
}


//jwt is a bearer token anything that has it is safe to pass data to
userSchema.methods.generateAccessToken = function(){
    return jwt.sign(   //generates signing token with our given payload(fancy word for input)
        {
            _id: this._id,
            email:this.email,
            username:this.username,
            fullName:this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema)