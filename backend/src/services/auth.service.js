import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import { getFeatureCodesForUser } from "../utils/features.js";
import { userSelectWithOrganization } from "../utils/tenant.js";
import { validateEmail, validateEnum } from "../utils/validation.js";

const publicUserSelect = {
  ...userSelectWithOrganization(),
  createdAt: true,
  updatedAt: true
};

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, organizationId: user.organizationId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

export async function registerUser(data) {
  const { name, email, password, role = "ADMIN" } = data;

  if (!name || !email || !password) {
    throw new ApiError(400, "Name, email, and password are required");
  }

  if (!validateEmail(email)) {
    throw new ApiError(400, "A valid email address is required");
  }

  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  validateEnum(role, ["ADMIN", "AGENT", "STAFF"], "Role");

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ApiError(409, "Email is already registered");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.$transaction(async (tx) => {
    const organization = data.organizationId
      ? await tx.organization.findUnique({ where: { id: Number(data.organizationId) } })
      : await tx.organization.create({
          data: {
            name: data.organizationName || `${name}'s Organization`,
            email,
            phone: data.organizationPhone,
            address: data.organizationAddress,
            plan: data.plan || "FREE"
          }
        });

    if (!organization || organization.status !== "ACTIVE") {
      throw new ApiError(400, "A valid active organization is required");
    }

    return tx.user.create({
      data: { name, email, password: hashedPassword, role, organizationId: organization.id },
      select: publicUserSelect
    });
  });

  return { user, token: signToken(user) };
}

export async function loginUser(data) {
  const { email, password } = data;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  if (!validateEmail(email)) {
    throw new ApiError(400, "A valid email address is required");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      organization: {
        select: { id: true, name: true, status: true, plan: true }
      }
    }
  });
  if (!user || user.status !== "ACTIVE") {
    throw new ApiError(401, "Invalid credentials");
  }

  if (user.organization && user.organization.status !== "ACTIVE") {
    throw new ApiError(403, "Your organization is inactive. Please contact your system administrator.");
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw new ApiError(401, "Invalid credentials");
  }

  const publicUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    organizationId: user.organizationId,
    organization: user.organization,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
  publicUser.features = await getFeatureCodesForUser(publicUser);

  return { token: signToken(user), user: publicUser };
}
