import jwt from "jsonwebtoken";
import { env } from "../env.js";
export function signJwt(user) {
    return jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.JWT_SECRET, { expiresIn: "7d" });
}
export function verifyJwt(token) {
    try {
        return jwt.verify(token, env.JWT_SECRET);
    }
    catch {
        return null;
    }
}
