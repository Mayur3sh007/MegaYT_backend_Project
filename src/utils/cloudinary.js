import { v2 as cloudinary } from "cloudinary";  //coz writing v2 in code looks awful
import fs from "fs";    //Inbuilt package in node used for read and write ops

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {

        if(!localFilePath) return null

        //upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        //Now file has been uploaded successfully

        console.log("File uploaded on Cloudinary", response.url);

        return response //for user

    } catch (error) {
        fs.unlinkSync(localFilePath) //remove locally saved temp file as upload operation has failed
        return null;
    }
}

export {uploadOnCloudinary};