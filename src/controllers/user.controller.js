import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser=asyncHandler( async(req,res)=>{
   const {username,email,fullName,password}=req.body
    console.log("email : ",email) ;

    if([username,email,fullName,password].some((field)=>
         field?.trim() ==="")
    ){
        throw new  ApiError(400,"all fields are  required")
    }

    const existedUser=await User.findOne({
        $or: [ {username}  ,  {email}]
    })
    if(existedUser){
        throw new ApiError(409,"User with email or username already exist")
    }
    console.log(req.files);

    const avatarLocalPath =req.files?.avatar[0]?.path;
    //const coverImagePath=req.files?.coverImage[0]?.path;
    
    let coverImagePath ;
    if(req.files && Array.isArray(req.files.coverImage) && req.coverImage.length >0){
      coverImagePath=req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is required");
    }
    
   const avatar =await uploadOnCloudinary (avatarLocalPath)
   const coverImage= await uploadOnCloudinary(coverImagePath)
   
   if(!avatar){
    throw new ApiError(400,"avatar file is required");
   }

  const user= await User.create({
      fullName,
      avatar:avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username:username.toLowerCase()
   })
   const userCreated= await User.findById(user._id).select(
    "-password -refreshToken"
   )
   if(!userCreated){
    throw new ApiError(500,"Something went wrong while registring user")
   }
   return res.status(201).json(
     new ApiResponse(200,userCreated,"User registered Successfully")   
   )


})



export {registerUser}