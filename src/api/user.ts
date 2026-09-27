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

userRouter.post("/request-role", (req, res) => {
  const user = req.user!;
  const currentRoles = Array.isArray(user.roles) ? [...user.roles] : [user.role || "CUSTOMER"];
  if (!currentRoles.includes("PROJECT_OWNER_PENDING") && !currentRoles.includes("PROJECT_OWNER")) {
    currentRoles.push("PROJECT_OWNER_PENDING");
    userRepository.updateUser(user.id, { roles: currentRoles });
  }
  res.json({ message: "درخواست ارتقای نقش با موفقیت ثبت شد و در انتظار بررسی مدیریت قرار گرفت." });
});

userRouter.put("/:id/approve-role", (req, res) => {
  const admin = req.user!;
  const adminRoles: string[] = Array.isArray(admin.roles) ? admin.roles : [admin.role || ""];
  const isAdmin = adminRoles.some(r => r.toUpperCase() === "ADMIN" || r.toUpperCase() === "SUPER_ADMIN");

  if (!isAdmin) {
    return res.status(403).json({
      code: "FORBIDDEN",
      error: "دسترسی مجاز نمی‌باشد. این عملیات نیازمند نقش مدیر ارشد سیستم (ADMIN) است."
    });
  }

  const targetUser = userRepository.getUserById(req.params.id);
  if (!targetUser) return res.status(404).json({ error: "کاربر مورد نظر یافت نشد." });

  const currentRoles: string[] = Array.isArray(targetUser.roles) ? [...targetUser.roles] : [targetUser.role || "CUSTOMER"];
  const newRoles = currentRoles.filter(r => r !== "PROJECT_OWNER_PENDING");
  if (!newRoles.includes("PROJECT_OWNER")) newRoles.push("PROJECT_OWNER");

  userRepository.updateUser(targetUser.id, { roles: newRoles });
  res.json({ message: "نقش کاربر با موفقیت تأیید گردید." });
});

// Admin endpoint to see pending users
userRouter.get("/pending-roles", (req, res) => {
  const admin = req.user!;
  const adminRoles: string[] = Array.isArray(admin.roles) ? admin.roles : [admin.role || ""];
  const isAdmin = adminRoles.some(r => r.toUpperCase() === "ADMIN" || r.toUpperCase() === "SUPER_ADMIN");

  if (!isAdmin) {
    return res.status(403).json({
      code: "FORBIDDEN",
      error: "دسترسی مجاز نمی‌باشد. این عملیات نیازمند نقش مدیر ارشد سیستم (ADMIN) است."
    });
  }

  const allUsers = userRepository.getUsers();
  const pending = allUsers.filter(u => Array.isArray(u.roles) && u.roles.includes("PROJECT_OWNER_PENDING"));
  res.json(pending);
});

// Explicit rejection of development backdoor route
userRouter.all("/dev-make-admin", (req, res) => {
  return res.status(404).json({
    code: "NOT_FOUND",
    error: "این مسیر در سیستم وجود ندارد و دسترسی به آن مسدود می‌باشد."
  });
});

export default userRouter;

