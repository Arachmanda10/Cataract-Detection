import type { NextFunction, Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth.js';

// Wajib Login
export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
    });

    if(!session){
        res.status(401).json({ message: "Belum Login" });
        return;
    }

    req.authSession = session;
    next();
}

// wajib admin
export async function requireAdmin(
    req: Request,
    res: Response,
    next: NextFunction
) {
    if (req.authSession?.user.role !== 'admin') {
        res.status(403).json({ message: "Tidak memiliki akses" });
        return;
    }

    next();
}