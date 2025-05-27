import { z } from "zod";
import bcrypt from "bcrypt";
import prisma from "../config/database.config.js";
import jwt from "jsonwebtoken";

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

const roleEnum = z
  .string()
  .transform((val) => val.toUpperCase())
  .refine((val) => val === "RECRUITER" || val === "CANDIDATE", {
    message: "Role must be either RECRUITER or CANDIDATE",
  });

const signupSchema = z.object({
  firstName: z.string().min(3, "First name must be at least 3 characters"),
  lastName: z.string().min(3, "Last name must be at least 3 characters"),
  username: z.string().min(4, "Username must be at least 4 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      passwordRegex,
      "Password must contain uppercase, lowercase, number, and special character"
    ),
  role: roleEnum.optional().default("CANDIDATE"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      passwordRegex,
      "Password must contain uppercase, lowercase, number, and special character"
    ),
});

export const candidateProfileSchema = z.object({
  bio: z.string().optional(),
  skills: z.array(z.string()),
  resumeUrl: z.string().url("Invalid URL").optional(),
  experience: z.number().int().nonnegative().optional(),
});


export const signUp = async (req, res) => {
  try {
    const parsedData = signupSchema.parse(req.body);
    const { firstName, lastName, username, email, password, role } = parsedData;
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return res.status(409).json({ message: "User with this email or username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        username,
        email,
        password: hashedPassword,
        role,
      },
    });

    return res.status(201).json({ message: "User created successfully", userId: newUser.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


export const login = async (req, res) => {
  try {
    const parsedData = loginSchema.parse(req.body);
    const { email, password } = parsedData;

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (!existingUser) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, existingUser.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: existingUser.id, role: existingUser.role }, process.env.JWT_KEY, { expiresIn: "1h" });

    res.status(200).json({ login: "success", token });
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};



//profile

export const getCandidateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    if (role !== "CANDIDATE") {
      return res.status(403).json({ message: "Forbidden access: Only CANDIDATE can view profile" });
    }

    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
    });

  
    if (!profile) {
      return res.status(200).json({
        bio: "",
        skills: [],
        resumeUrl: "",
        experience: null,
      });
    }

    return res.status(200).json(profile);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const upsertCandidateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    if (role !== "CANDIDATE") {
      return res.status(403).json({ message: "Forbidden access: Only CANDIDATE can update profile" });
    }

   
    const parsed = candidateProfileSchema.parse(req.body);
    const { bio, skills, resumeUrl, experience } = parsed;

    const profile = await prisma.candidateProfile.upsert({
      where: { userId },
      update: { bio, skills, resumeUrl, experience },
      create: {
        userId,
        bio,
        skills,
        resumeUrl,
        experience,
      },
    });

    return res.status(200).json({ message: "Profile saved successfully", profile });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors });
    }
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


export const getAllJobPosts = async (req, res) => {
  try {
    const role = req.user.role;

    if (role !== "CANDIDATE") {
      return res.status(403).json({ message: "Forbidden: Only candidates can view job posts" });
    }

    const jobs = await prisma.jobPost.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        recruiter: {
          select: {
            companyName: true,
          }
        }
      }
    });

    return res.status(200).json(jobs);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


// POST /jobpost/:jobId/apply
export const applyToJob = async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.userId;

    if (role !== "CANDIDATE") {
      return res.status(403).json({ message: "Only CANDIDATES can apply" });
    }

  
    const candidate = await prisma.candidateProfile.findUnique({
      where: { userId },
    });

    if (!candidate) {
      return res.status(400).json({ message: "Candidate profile not found" });
    }

    
    const jobPostId = req.params.jobPostId;

   
    const alreadyApplied = await prisma.application.findFirst({
      where: {
        jobPostId,
        candidateId: candidate.id,
      },
    });

    if (alreadyApplied) {
      return res.status(400).json({ message: "Already applied to this job" });
    }

   
    const application = await prisma.application.create({
      data: {
        jobPostId,
        candidateId: candidate.id,
      },
    });

    return res.status(200).json({ message: "Application successful", application });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};




export const getAppliedJobs = async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.userId;

    if (role !== "CANDIDATE") {
      return res.status(403).json({ message: "Only CANDIDATES can view applied jobs" });
    }

    const candidate = await prisma.candidateProfile.findUnique({
      where: { userId },
    });

    if (!candidate) {
      return res.status(400).json({ message: "Candidate profile not found" });
    }

    const applications = await prisma.application.findMany({
      where: {
        candidateId: candidate.id,
      },
      include: {
        jobPost: true,  
      },
    });

    
    const appliedJobs = applications.map(app => app.jobPost);

    return res.status(200).json(appliedJobs);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
