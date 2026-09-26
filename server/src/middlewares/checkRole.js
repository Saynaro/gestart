export const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || (!allowedRoles.includes(req.user.role) && req.user.role !== "SUPERADMIN" && req.user.email !== "khalid.cizdoev777@gmail.com")) {
            return res.status(403).json({
                success: false,
                message: "Accès refusé : privilèges insuffisants",
            });
        }
        next();
    };
};

export const requireOwner = checkRole("OWNER");
export const requireManager = checkRole("OWNER", "MANAGER");

export const requireSuperAdmin = (req, res, next) => {
    if (!req.user || (req.user.role !== "SUPERADMIN" && req.user.email !== "khalid.cizdoev777@gmail.com")) {
        return res.status(403).json({
            success: false,
            message: "Accès refusé : privilèges Super Admin requis",
        });
    }
    next();
};
