import { z } from "zod";
import prisma from "../config/database.config.js";
export const recruiterProfileSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters").optional(),
  designation: z.string().min(2, "Designation must be at least 2 characters").optional(),
});


export const jobPostSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z.string().min(2, "Location is required"),
  salary: z.number().min(0, "Salary must be a positive number"),
});

export const upsertRecruiterProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    if (role !== "RECRUITER") {
      return res.status(403).json({ message: "Forbidden: Only RECRUITER can update profile" });
    }

    const parsed = recruiterProfileSchema.parse(req.body);
    const { companyName, designation } = parsed;

    const profile = await prisma.recruiterProfile.upsert({
      where: { userId },
      update: { companyName, designation },
      create: { userId, companyName, designation },
    });

    res.status(200).json({ message: "Profile saved", profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const getRecruiterProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    if (role !== "RECRUITER") {
      return res.status(403).json({ message: "Forbidden: Only RECRUITER can view profile" });
    }

    let profile = await prisma.recruiterProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Return empty fields if profile doesn't exist
      profile = { companyName: "", designation: "", userId };
    }

    res.status(200).json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const postJob = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    if (role !== "RECRUITER") {
      return res.status(403).json({ message: "Only RECRUITER can post jobs" });
    }

    const parsed = jobPostSchema.parse(req.body);
    const { title, description, location, salary } = parsed;

    const recruiterProfile = await prisma.recruiterProfile.findUnique({ where: { userId } });
    if (!recruiterProfile) {
      return res.status(400).json({ message: "Recruiter profile not found" });
    }

    const job = await prisma.jobPost.create({
      data: {
        title,
        description,
        location,
        salary,
        recruiterId: recruiterProfile.id,
      },
    });

    res.status(201).json({ message: "Job posted successfully", job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const getRecruiterJobs = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    if (role !== "RECRUITER") {
      return res.status(403).json({ message: "Forbidden: Only RECRUITER can access jobs" });
    }

    const recruiterProfile = await prisma.recruiterProfile.findUnique({ where: { userId } });

    const jobs = await prisma.jobPost.findMany({
      where: { recruiterId: recruiterProfile.id },
    });

    res.status(200).json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const deleteJob = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;
    const jobId = req.params.id;

    if (role !== "RECRUITER") {
      return res.status(403).json({ message: "Only RECRUITER can delete jobs" });
    }

    const recruiterProfile = await prisma.recruiterProfile.findUnique({ where: { userId } });

    if (!recruiterProfile) {
      return res.status(404).json({ message: "Recruiter profile not found" });
    }

    const job = await prisma.jobPost.findUnique({ where: { id: jobId } });

    if (!job || job.recruiterId !== recruiterProfile.id) {
      return res.status(404).json({ message: "Job not found or unauthorized" });
    }

    // Step 1: Delete all applications related to this job
    await prisma.application.deleteMany({
      where: { jobPostId: jobId }
    });

    // Step 2: Delete the job post itself
    await prisma.jobPost.delete({
      where: { id: jobId }
    });

    res.status(200).json({ message: "Job deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



// GET /jobpost/applications
export const getJobApplications = async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.userId;

    if (role !== "RECRUITER") {
      return res.status(403).json({ message: "Only RECRUITERS can view applications" });
    }

    const recruiter = await prisma.recruiterProfile.findUnique({
      where: { userId },
    });

    if (!recruiter) {
      return res.status(400).json({ message: "Recruiter profile not found" });
    }

    const applications = await prisma.application.findMany({
      where: {
        jobPost: {
          recruiterId: recruiter.id,
        },
      },
      include: {
        jobPost: true,
        candidate: {
          include: {
            user: {
              select: {
                email: true,
                username: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json(applications);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};



