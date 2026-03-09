import { Router } from "express";
import { prisma } from "../db";
import { generateToken, AuthUser } from "../middleware/auth";

const router = Router();

/**
 * POST /api/auth/login
 * Dev-only: accepts email, returns JWT for the matching seeded user.
 */
router.post("/login", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "email required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    res.status(401).json({ error: "User not found or inactive" });
    return;
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  } as AuthUser);

  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

export default router;
