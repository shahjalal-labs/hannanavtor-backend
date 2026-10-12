import multer from "multer";

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 3000 * 1024 * 1024 }, // 3000 MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mpeg",
      "video/mp4",
      "video/x-matroska",
      "audio/mpeg",
      "application/zip",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("File type not allowed") as unknown as null, false);
    }
    cb(null, true);
  },
});

// upload single image
const license = upload.single("license");
const profileImage = upload.single("profileImage");
const blogImage = upload.single("blogImage");
const conferencePhoto = upload.single("conferencePhoto");
const experiencePhoto = upload.single("experiencePhoto");
const uploadDocuments = upload.single("uploadDocuments");
const communityPhoto = upload.single("communityPhoto");

// upload multiple image
const uploadMultiple = upload.fields([
  { name: "medicalReports", maxCount: 5 },
  { name: "diagnosticReports", maxCount: 5 },
  { name: "fileUrl", maxCount: 5 },
  { name: "documentsPhoto", maxCount: 1 },
  { name: "uploadVideo", maxCount: 1 },
]);

export const fileUploader = {
  upload,
  license,
  uploadMultiple,
  profileImage,
  blogImage,
  conferencePhoto,
  experiencePhoto,
  uploadDocuments,
  communityPhoto,
};
