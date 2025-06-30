const path = require('path');
const fs = require('fs/promises');

const normalizeTitle = (title) => {
  return title
    ? title.normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-zA-Z0-9-_ ]/g, '') // Remove special chars
        .replace(/\s+/g, '_') // Spaces to underscores
        .toLowerCase()
    : 'untitled';
};

const saveFile = async (file, documentId, documentTitle) => {
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

  // Create upload directory using normalized document title
  const safeTitle = normalizeTitle(documentTitle);
  const uploadDir = path.join(__dirname, '../Uploads', safeTitle);
  await fs.mkdir(uploadDir, { recursive: true });

  // Use original file name, add suffix if file exists
  let fileName = file.originalname;
  let filePath = path.join(uploadDir, fileName);
  let counter = 1;
  while (await fs.stat(filePath).catch(() => false)) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    fileName = `${base}_${counter}${ext}`;
    filePath = path.join(uploadDir, fileName);
    counter++;
  }

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