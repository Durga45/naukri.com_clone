import jwt from "jsonwebtoken";

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

 
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: Token missing or malformed" });
  }

  const token = authHeader.split(" ")[1]; 

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    req.user = decoded; // contains userId, role
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid Token" });
  }
};
