// Organization hierarchy configuration
const hierarchy = [
  { level: 1, superior: "CEO", subordinate: "CTO" },
  { level: 2, superior: "CTO", subordinate: "VP Engineering" },
  { level: 3, superior: "VP Engineering", subordinate: "Director of Engineering" },
  { level: 4, superior: "Director of Engineering", subordinate: "Engineering Manager" },
  { level: 5, superior: "Engineering Manager", subordinate: "Tech Lead" },
  { level: 6, superior: "Tech Lead", subordinate: "Senior Engineer" },
  { level: 7, superior: "Engineering Manager", subordinate: "Software Engineer" },
  { level: 8, superior: "Engineering Manager", subordinate: "Junior Engineer" },
  { level: 9, superior: "Tech Lead", subordinate: "Intern" },
];

const parallelRoles = [
  { managedBy: "Engineering Manager", role: "QA Engineer" },
  { managedBy: "Engineering Manager", role: "DevOps Engineer" },
  { managedBy: "Engineering Manager", role: "Data Engineer" },
  { managedBy: "Engineering Manager", role: "Security Engineer" },
  { managedBy: "IT Manager", role: "System Administrator" },
  { managedBy: "IT Manager", role: "Network Engineer" },
];

const dualApprovalRoles = ["Senior Engineer", "Tech Lead"];

// Get role by name
function getRoleByName(roleName) {
  const entry = hierarchy.find(h =>
    h.superior === roleName || h.subordinate === roleName
  );

  if (!entry) {
    // Check parallel roles
    const parallel = parallelRoles.find(p => p.role === roleName);
    if (parallel) {
      return { name: roleName, level: 4 };
    }
    return null;
  }

  return {
    name: roleName,
    level: entry.level
  };
}

// Get subordinates for a role
function getSubordinates(roleName) {
  return hierarchy
    .filter(h => h.superior === roleName)
    .map(h => h.subordinate);
}

// Get superior for a role
function getSuperior(roleName) {
  const entry = hierarchy.find(h => h.subordinate === roleName);
  return entry?.superior || null;
}

// Get all roles at a level
function getRolesAtLevel(level) {
  return hierarchy
    .filter(h => h.level === level)
    .map(h => h.subordinate);
}

// Check if role requires dual approval
function requiresDualApproval(roleName) {
  return dualApprovalRoles.includes(roleName);
}

// Check if role is in hierarchy
function isValidRole(roleName) {
  return hierarchy.some(h =>
    h.superior === roleName || h.subordinate === roleName
  ) || parallelRoles.some(p => p.role === roleName);
}

module.exports = {
  hierarchy,
  parallelRoles,
  dualApprovalRoles,
  getRoleByName,
  getSubordinates,
  getSuperior,
  getRolesAtLevel,
  requiresDualApproval,
  isValidRole
};
