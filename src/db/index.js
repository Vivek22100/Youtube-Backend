import mongoose from "mongoose";

import { DB_NAME } from "../constants.js";

   
const connectdb=async()=>{
    try{
        const connectioninstance=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`/n MongoDB connected:${connectioninstance.connection.host}`)
    }
    catch(error){
        console.log("mongodb connection error",error);
        process.exit(1);
    }
}

export default connectdb



/*
const app=express()  
;(async()=>{
    try{
       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`) 
       app.on("error",(error)=>{
           console.log("error",error);
           throw error
       })
       
       app.listen(process.env.PORT,()=>{
        console.log(`app is listening in the port ${process.env.PORT}`);
       })
    }
    catch(error){
        console.error("ERROR:",error);
        throw err
    }
})()
*/