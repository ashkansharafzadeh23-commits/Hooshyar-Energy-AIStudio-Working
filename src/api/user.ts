import express from "express";
import { userRepository } from '../repositories/userRepository.js';
import { verifyAuthToken, requireAuth } from "./auth.js";

const userRouter = express.Router();

userRouter.use(verifyAuthToken);
userRouter.use(requireAuth);

userRouter.get("/history", (req, res) => {
  const userId = req.user!.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  const history = userRepository.getHistoryByUserId(userId);
  
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedHistory = history.slice(startIndex, endIndex);

  res.json({
    total: history.length,
    page,
    limit,
    history: paginatedHistory,
  });
});

export default userRouter;

userRouter.post("/request-role", (req, res) => {
  const user = req.user!;
  // Store this request somewhere or just add it to user with a pending flag
  // The prompt says: "sets `roles` to include `"PROJECT_OWNER"` with status `pending_review`"
  // Since User interface has roles?: string[], we could do:
  const currentRoles = user.roles || ["customer"];
  if (!currentRoles.includes("PROJECT_OWNER_PENDING")) {
    userRepository.updateUser(user.id, { roles: [...currentRoles, "PROJECT_OWNER_PENDING"] });
  }
  res.json({ message: "Request submitted" });
});

userRouter.put("/:id/approve-role", (req, res) => {
  const admin = req.user!;
  if (!admin.roles?.includes("ADMIN")) {
    return res.status(403).json({ error: "Require ADMIN role" });
  }
  const targetUser = userRepository.getUserById(req.params.id);
  if (!targetUser) return res.status(404).json({ error: "User not found" });

  const currentRoles = targetUser.roles || ["customer"];
  const newRoles = currentRoles.filter(r => r !== "PROJECT_OWNER_PENDING");
  if (!newRoles.includes("PROJECT_OWNER")) newRoles.push("PROJECT_OWNER");

  userRepository.updateUser(targetUser.id, { roles: newRoles });
  res.json({ message: "Role approved" });
});

// Admin endpoint to see pending users
userRouter.get("/pending-roles", (req, res) => {
  const admin = req.user!;
  if (!admin.roles?.includes("ADMIN")) {
    return res.status(403).json({ error: "Require ADMIN role" });
  }
  const allUsers = userRepository.getUsers();
  const pending = allUsers.filter(u => u.roles?.includes("PROJECT_OWNER_PENDING"));
  res.json(pending);
});

// Dev helper to self-grant ADMIN (strictly disabled in production)
userRouter.post("/dev-make-admin", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({
      code: "FORBIDDEN",
      error: "Development privilege escalation is permanently disabled in production mode."
    });
  }
  const user = req.user!;
  const currentRoles = user.roles || ["customer"];
  if (!currentRoles.includes("ADMIN")) {
    userRepository.updateUser(user.id, { roles: [...currentRoles, "ADMIN", "PROJECT_OWNER"] });
  }
  res.json({ message: "Admin granted" });
});
