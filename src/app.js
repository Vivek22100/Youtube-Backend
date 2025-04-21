import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app=express();

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:"16kb"}))

app.use(express.urlencoded({extended:true,limit:"16 kb"}))

app.use(express.static("public"))



export {app}

connectdb()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
            console.log(`server is listening on the port:${process.env.PORT}`);
    })

})

