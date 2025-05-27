import express from "express"
import { signUp ,login, getCandidateProfile, upsertCandidateProfile, getAllJobPosts, applyToJob, getAppliedJobs} from "../controllers/user.controller.js"
import { authenticate } from "../middleware/user.auth.js"

const userRouter=express.Router()


userRouter.post('/signup',signUp)
userRouter.post('/login',login)
userRouter.get('/profile',authenticate,getCandidateProfile)
userRouter.post('/update/profile',authenticate,upsertCandidateProfile)
userRouter.get('/alljobposts',authenticate,getAllJobPosts)
userRouter.post('/jobpost/:jobPostId/apply',authenticate,applyToJob)
userRouter.get('/appliedjobs',authenticate,getAppliedJobs)



export default userRouter