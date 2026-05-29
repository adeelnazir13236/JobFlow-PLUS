import ApiError from "./ApiError.js";

export function isSystemAdmin(user) {
  return user?.role === "SYSTEM_ADMIN";
}

export function requireOrganizationId(user) {
  if (isSystemAdmin(user)) {
    return null;
  }

  if (!user?.organizationId) {
    throw new ApiError(403, "User is not assigned to an organization");
  }

  return user.organizationId;
}

export function tenantWhere(user) {
  const organizationId = requireOrganizationId(user);
  return organizationId ? { organizationId } : {};
}

export function tenantData(user) {
  const organizationId = requireOrganizationId(user);

  if (!organizationId) {
    throw new ApiError(400, "System administrators must select an organization to create tenant data");
  }

  return { organizationId };
}

export function userSelectWithOrganization() {
  return {
    id: true,
    name: true,
    email: true,
    role: true,
    status: true,
    organizationId: true,
    organization: {
      select: {
        id: true,
        name: true,
        status: true,
        plan: true
      }
    }
  };
}
