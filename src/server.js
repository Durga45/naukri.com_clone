import express from "express"
import dotenv from "dotenv"
import userRouter from "./routes/user.routes.js"
import recruiterRouter from "./routes/recuriter.route.js"


const app=express()
app.use(express.json())
dotenv.config()

app.use('/v1/user',userRouter)
app.use('/v1/recruit',recruiterRouter)

app.get('/',(req,res)=>{
  res.send("welcome to naukri.com")
})

app.listen(3000,()=>{
  console.log("server started on port:3000")
})