// src/utils/permissions.js

export const ROLE_PERMISSIONS = {
  "Super Admin": {
    pages: ["/admin/dashboard", "/admin/manage", "/admin/requests", "/admin/feedback", "/admin/admin-management", "/admin/household-management", "/admin/reports", "/admin/profile", "/admin/logs", "/admin/resident-scanner"],
    services: ["Peace & Order", "Livelihood", "BSWD", "BADAC", "VAWC", "BOSCA"]
  },
  "Secretary": {
    pages: ["/admin/dashboard", "/admin/manage", "/admin/requests", "/admin/feedback", "/admin/household-management", "/admin/reports", "/admin/profile", "/admin/resident-scanner"],
    services: ["Peace & Order", "Livelihood", "BSWD", "BADAC", "VAWC", "BOSCA"]
  },
  "Standard Admin": {
    pages: ["/admin/dashboard", "/admin/manage", "/admin/requests", "/admin/feedback", "/admin/household-management", "/admin/reports", "/admin/profile", "/admin/resident-scanner"],
    services: ["Peace & Order", "Livelihood", "BSWD", "BADAC", "VAWC", "BOSCA"]
  },
  "BSWD Head": {
    pages: ["/admin/dashboard", "/admin/manage", "/admin/requests", "/admin/feedback", "/admin/profile", "/admin/resident-scanner"],
    services: ["BSWD"]
  },
  "BSWD Staff": {
    pages: ["/admin/dashboard", "/admin/manage", "/admin/requests", "/admin/feedback", "/admin/profile", "/admin/resident-scanner"],
    services: ["BSWD"]
  },
  "VAWC Head": {
    pages: ["/admin/dashboard", "/admin/manage", "/admin/requests", "/admin/feedback", "/admin/profile", "/admin/resident-scanner"],
    services: ["VAWC"]
  },
  "VAWC Staff": {
    pages: ["/admin/dashboard", "/admin/manage", "/admin/requests", "/admin/feedback", "/admin/profile", "/admin/resident-scanner"],
    services: ["VAWC"]
  },
  "BOSCA Head": {
    pages: ["/admin/dashboard", "/admin/manage", "/admin/requests", "/admin/feedback", "/admin/profile", "/admin/resident-scanner"],
    services: ["BOSCA"]
  },
  "BOSCA Staff": {
    pages: ["/admin/dashboard", "/admin/manage", "/admin/requests", "/admin/feedback", "/admin/profile", "/admin/resident-scanner"],
    services: ["BOSCA"]
  },
  "Peace&Order Head": {
    pages: ["/admin/dashboard", "/admin/manage", "/admin/requests", "/admin/feedback", "/admin/reports", "/admin/household-management", "/admin/profile", "/admin/resident-scanner"],
    services: ["Peace & Order"]
  },
  "Peace&Order Staff": {
    pages: ["/admin/dashboard", "/admin/manage", "/admin/requests", "/admin/feedback", "/admin/reports", "/admin/household-management", "/admin/profile", "/admin/resident-scanner"],
    services: ["Peace & Order"]
  },
  "BADAC Head": {
    pages: ["/admin/dashboard", "/admin/manage", "/admin/requests", "/admin/feedback", "/admin/profile", "/admin/resident-scanner"],
    services: ["BADAC"]
  },
  "BADAC Staff": {
    pages: ["/admin/dashboard", "/admin/manage", "/admin/requests", "/admin/feedback", "/admin/profile", "/admin/resident-scanner"],
    services: ["BADAC"]
  },
  "Livelihood Head": {
    pages: ["/admin/dashboard", "/admin/manage", "/admin/requests", "/admin/feedback", "/admin/profile", "/admin/resident-scanner"],
    services: ["Livelihood"]
  },
  "Livelihood Staff": {
    pages: ["/admin/dashboard", "/admin/manage", "/admin/requests", "/admin/feedback", "/admin/profile", "/admin/resident-scanner"],
    services: ["Livelihood"]
  }
};