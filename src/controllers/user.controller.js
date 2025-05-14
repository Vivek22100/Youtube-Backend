import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import  jwt from "jsonwebtoken";
import { use } from "react";

const generateAccessAndRefreshTokens= async (userId)=>{
    try{
        const user=await User.findById(userId)
        const accessToken= user.generateAccessToken()
        const refreshToken= user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validatebeforeSave:false})

        return {accessToken,refreshToken}
    }
    catch(error){
        throw new ApiError(500,"Something went wrong while generating refresh and access tokens")
    }
}


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

const loginUser=asyncHandler(async(req,res)=>{
            const {email,username,password}=req.body
            if(!username && !email){
                throw new ApiError(400,"username or email is required")
            } 
            
            const user=await  User.findOne({
               $or:[{username,email}]
            })

            if(!user){
                throw new ApiError(404,"user not exist")
            }

          const isPasswordValid= await user.isPasswordCorrect(password)
           if(!isPasswordValid){
            throw new ApiError(401,"Invald user credentials")
           }

        const{accessToken,refreshToken}= await generateAccessAndRefreshTokens(user._id)
        
        const loggedInUser= await User.findById(user._id).select("-password -refreshToken")

        const options={
            httpOnly:true,
            secure:true
        }

        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken)
        .json(
            new ApiResponse(
                200,{
                    user: loggedInUser,accessToken,refreshToken
                },
                "user logged in successfully"
            )
        )
}
)

const logoutUser=asyncHandler(async(req,res)=>{
    User.findByIdAndUpdate(
          req.user._id,{
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
          
    )

    const options={
        httpOnly:true,
        secure:true
    }

    return res 
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logout Successfully"))
})

const refreshAccessToken=asyncHandler(async(req,res)=>{
   const incomingRefreshToken= req.cookies.refreshToken || req.body.refreshToken
   if(!incomingRefreshToken){
      throw new ApiError(401,"unauthorised Request")
   }
try {
    
       const decodedToken=jwt.verify(incomingRefreshToken,process.env.ACCESS_TOKEN_SECRET) 
    
       const user=await(User.findById(decodedToken?._id))
    
       if(!user){
           throw new ApiError(401,"Invalid refresh token")
       }
       
       if(incomingRefreshToken !== user?.refreshToken){
        throw new ApiError(401,"Refresh token is expired r used")
    
       }
       
       const options={
        httpOnly:true,
        secure:true
       }
        const {accessToken,newrefreshToken}= await generateAccessAndRefreshTokens(user._id)
      
        return res.status(200).cookie("accessToken",options).cookie("newrefreshToken",options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken:newrefreshToken},
                "Access Token Refresh"
            )
        )
    }
    catch (error) {
           throw new ApiError(401,error?.message || "Invalid Refresh Token")
    }
  

})

const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body
    const user=await User.findById(req.user?._id)
    
   const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
   if(!isPasswordCorrect){
     throw new ApiError(400,"Invalid Old Password")
   }

   use.password=newPassword
   await user.save({validatebeforeSave:false})
  
   return res.status(200).json(new ApiResponse(200,{},"Password Changed Successfully"))
})

const getCurrentUser=asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(200,req.user,"current user fetched successfully")
})

const updateAccountDetail=asyncHandler(async(req,res)=>{
    const {fullName,email}=req.body

    if(!fullName || !email){
        throw new ApiError(400 ,"All fields are required")
    }
   const user= User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName:fullName,
                email :email
            }

        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details Updated Successfully"))
})

const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    
    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on Avatar")

    }

   const user= await User.findByIdAndUpdate(
        req.user?._id,

        {
            $set:{
                avatar:avatar.url
            }
        },
        {new :true}
    ).select("-password")
  
    return res
    .status(200)
    .json(new ApiResponse(200,user,"avatar image updated succesfully"))
    
})

const updateUserCoverImage=asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"CoverImage file is missing")
    }

    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    
    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading on Cover Image")

    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,

        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new :true}
    ).select("-password")

     return res
    .status(200)
    .json(new ApiResponse(200,user,"Cover image updated succesfully"))
    
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetail,
    updateUserAvatar,
    updateUserCoverImage


}