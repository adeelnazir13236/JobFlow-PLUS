import prismaClientPkg from "@prisma/client";

const { Prisma } = prismaClientPkg;

export function notFound(req, _res, next) {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error";

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      statusCode = 409;
      message = "A record with this value already exists";
    }

    if (error.code === "P2025") {
      statusCode = 404;
      message = "Record not found";
    }
  }

  res.status(statusCode).json({ message });
}
