import { PrismaClient } from "@prisma/client";
import { hashPassword, comparePassword, generateToken } from "../utils/auth.js";

const prisma = new PrismaClient();

// User registration
export const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already in use" });

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, password: hashed },
    });

    res.json({ user, token: generateToken(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// User login
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const valid = await comparePassword(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });

    res.json({ user, token: generateToken(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
