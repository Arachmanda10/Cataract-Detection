import {NextFunction, Request, Response} from 'express';
import multer from 'multer';

//middleware memiliki 4 parameter dan perlu didaftarkan paling  akhir
export function errorHandler(
    err: unknown, 
    _req: Request, 
    res: Response, 
    _next: NextFunction
) {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(413).json({
                message: "Ukuran file maksimal 5 Mb"
            });
            return;
        }
        res.status(400).json({
            message: "Upload tidak valid " + err.message
        });
        return;
    }

    console.error(err);
    res.status(500).json({message: "Terjadi kesalahan pada server"});
}