const path = require('path');
const fs = require('fs/promises');

const saveFile = async (file, documentId) => {
  // Validate MIME type
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (!file.mimetype || !allowedTypes.includes(file.mimetype)) {
    throw new Error(`Unsupported file type: ${file.mimetype || 'undefined'}`);
  }

  // Create upload directory
  const uploadDir = path.join(__dirname, '../Uploads', documentId);
  await fs.mkdir(uploadDir, { recursive: true });

  // Generate unique file name
  const fileName = `${Date.now()}-${file.originalname}`;
  const filePath = path.join(uploadDir, fileName);

  // Save file
  await fs.writeFile(filePath, file.content);

  return {
    fileName,
    filePath,
    fileType: file.mimetype,
    fileSize: file.content.length,
    thumbnailPath: null, // Add thumbnail generation if needed
  };
};

module.exports = { saveFile };