export const FULL_EMAIL_ROLES = [
  "Super Admin",
  "Super admin",
  "Secretary",
  "Standard Admin",
];

export const maskEmail = (email) => {
  if (!email || typeof email !== "string") return "N/A";
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0) return trimmed;

  const username = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex);

  if (username.length <= 2) {
    return `${username[0]}****${domain}`;
  }

  const firstChar = username[0];
  return `${firstChar}****${domain}`;
};

export const canViewFullEmail = (userRole, isOwner = false) => {
  if (isOwner) return true;
  if (!userRole) return false;
  return FULL_EMAIL_ROLES.includes(userRole);
};

export const formatDisplayEmail = (email, userRole, isOwner = false) => {
  if (!email || email === "No email provided" || email === "N/A") {
    return email || "N/A";
  }
  if (canViewFullEmail(userRole, isOwner)) {
    return email;
  }
  return maskEmail(email);
};
