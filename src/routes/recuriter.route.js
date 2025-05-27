import express from "express"
import { authenticate } from "../middleware/user.auth.js"
import { deleteJob, getJobApplications, getRecruiterJobs, getRecruiterProfile, postJob, upsertRecruiterProfile } from "../controllers/recuriter.controller.js"

const recruiterRouter=express.Router()


recruiterRouter.get('/profile',authenticate,getRecruiterProfile)
recruiterRouter.post('/update/profile',authenticate,upsertRecruiterProfile)
recruiterRouter.post('/postnewjob',authenticate,postJob)
recruiterRouter.get('/postedjobs',authenticate,getRecruiterJobs)
recruiterRouter.delete('/jobpost/:id',authenticate,deleteJob)
recruiterRouter.get('/jobpost/applications',authenticate,getJobApplications)
export default recruiterRouter