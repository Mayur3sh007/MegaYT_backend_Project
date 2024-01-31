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

        // console.log("File uploaded on Cloudinary", response.url);

        fs.unlinkSync(localFilePath)    //if file upload success then remove from local

        return response //for user we return cloudinary link

    } catch (error) {
        fs.unlinkSync(localFilePath) //remove locally saved temp file as upload operation has failed
        return null;
    }
}

    const deleteOnCloudinary = async(oldCloudinaryAvatarURL)=>{

        try {

            // Extract the public ID from the Cloudinary URL
            const avatarId = oldCloudinaryAvatarURL.split("/").pop().split(".")[0];

            // console.log(avatarId)

            // Delete the resource from Cloudinary
            const response = await cloudinary.uploader.destroy(avatarId);

            return response.result === 'ok'; // Return true if the deletion was successful

        } catch (error) {
            console.log("Problems in Delete on cloudinary")
            return false;
        }
    }

export {uploadOnCloudinary,deleteOnCloudinary};