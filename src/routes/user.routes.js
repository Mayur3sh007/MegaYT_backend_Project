import { Router } from "express";
import { registerUser } from "../controllers/user.controllers.js";

const router = Router()

router.route("/register").post(registerUser)   //after coming here from app.js--> here /register will be appended in url and it will call registerUser Method 

export default router;