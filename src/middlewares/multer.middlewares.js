import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {   //in json we have req,res,next  but here in multer we also have 'file' and 'cb' is callBack  
      cb(null, "./public/temp")               //callbacks 1st param is null coz its for error handling(we can do it later) and 2nd is for where we wanna store our file thats why created public/temp folders with a gitkeep
    },
    filename: function (req, file, cb) {        
      cb(null, file.originalname)       //keep the name same as the user uploaded with.It doesnt matter much coz we keeping it for temporarily 
    }
  })
  
export const upload = multer({ 
    storage, 
})