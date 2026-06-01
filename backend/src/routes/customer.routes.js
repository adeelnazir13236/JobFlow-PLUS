import { Router } from "express";
import {
  editCustomer,
  getCustomer,
  listCustomers,
  removeCustomer,
  storeCustomer
} from "../controllers/customer.controller.js";
import { listCustomerCallLogs } from "../controllers/callLog.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";
import { requireFeature } from "../utils/features.js";

const router = Router();

router.use(authenticate);
router.use(requireFeature("CUSTOMERS"));

router.get("/", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT", "STAFF"), asyncHandler(listCustomers));
router.get("/:id", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT", "STAFF"), asyncHandler(getCustomer));
router.post("/", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(storeCustomer));
router.put("/:id", authorize("ADMIN", "AGENT"), asyncHandler(editCustomer));
router.delete("/:id", authorize("ADMIN"), asyncHandler(removeCustomer));
router.get("/:id/call-logs", authorize("ADMIN", "AGENT", "STAFF"), asyncHandler(listCustomerCallLogs));

export default router;
