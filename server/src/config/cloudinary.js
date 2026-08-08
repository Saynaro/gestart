import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

// Configuration de Cloudinary avec les clés d'environnement
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage Cloudinary pour les Avatars des utilisateurs
const avatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "gestart/avatars",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [{ width: 500, height: 500, crop: "limit" }]
    }
});

// Storage Cloudinary pour les Photos d'Intervention (Avant / Après)
const interventionPhotoStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "gestart/interventions",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "heic"],
        transformation: [{ width: 1200, height: 1200, crop: "limit" }]
    }
});

// Limite maximale par fichier : 10 Mo
export const uploadAvatarMiddleware = multer({
    storage: avatarStorage,
    limits: { fileSize: 10 * 1024 * 1024 }
}).single("avatar");

export const uploadPhotosMiddleware = multer({
    storage: interventionPhotoStorage,
    limits: { fileSize: 10 * 1024 * 1024 }
}).array("photos", 10);

// Helper pour uploader directement un buffer PDF généré dans Cloudinary
export const uploadPdfToCloudinary = (pdfBuffer, filename, folder = "gestart/documents") => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                public_id: filename,
                resource_type: "raw",
                format: "pdf"
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        );

        uploadStream.end(pdfBuffer);
    });
};

export { cloudinary };
