import { auth } from '../auth.js';

type Session = typeof auth.$Infer.Session;

declare global {
    namespace Express {
        interface Request {
            authSession?: Session;
        }
    }
}

export {};