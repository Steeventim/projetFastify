const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const uploadConfig = require('../config/upload');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');

class FileHandler {
  constructor() {
    this.uploadDir = uploadConfig.UPLOAD_DIR;
    this.thumbnailDir = path.join(this.uploadDir, 'thumbnails');
    this.initializeDirectories();
  }

  async initializeDirectories() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.thumbnailDir, { recursive: true });
    } catch (error) {
      console.error('Error creating directories:', error);
      throw error;
    }
  }

  async saveFile(file, documentId) {
    try {
      const extension = uploadConfig.getExtension(file.mimetype);
      if (!extension) {
        throw new Error(`Unsupported file type: ${file.mimetype}`);
      }

      // Validate file size
      const sizeLimit = uploadConfig.FILE_SIZE_LIMITS[extension.slice(1)];
      if (file.file.bytesRead > sizeLimit) {
        throw new Error(`File size exceeds limit of ${uploadConfig.getHumanReadableSize(sizeLimit)}`);
      }

      const fileName = `${uuidv4()}${extension}`;
      const filePath = path.join(this.uploadDir, fileName);
      
      // Save the file
      await fs.writeFile(filePath, await file.toBuffer());

      // Generate thumbnail for supported file types
      let thumbnailPath = null;
      if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
        thumbnailPath = await this.generateThumbnail(filePath, fileName, file.mimetype);
      }

      return {
        fileName,
        filePath,
        fileType: file.mimetype,
        fileSize: file.file.bytesRead,
        thumbnailPath,
        originalName: file.filename
      };
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  }

  async generateThumbnail(filePath, fileName, mimeType) {
    try {
      const thumbnailName = `thumb_${path.parse(fileName).name}.png`;
      const thumbnailPath = path.join(this.thumbnailDir, thumbnailName);

      if (mimeType === 'application/pdf') {
        // For PDFs, generate thumbnail from first page
        const pdfBytes = await fs.readFile(filePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const firstPage = pdfDoc.getPages()[0];
        const { width, height } = firstPage.getSize();
        
        // Convert PDF page to PNG using pdf-lib and sharp
        const pngBytes = await firstPage.translateContent(0, -height)
          .drawRectangle({
            x: 0,
            y: 0,
            width,
            height,
            color: [1, 1, 1],
          })
          .translateContent(0, height)
          .toPNG();

        await sharp(pngBytes)
          .resize(200, 200, { fit: 'inside' })
          .toFile(thumbnailPath);

        return thumbnailPath;
      } else if (mimeType.startsWith('image/')) {
        await sharp(filePath)
          .resize(200, 200, { fit: 'inside' })
          .toFile(thumbnailPath);
        return thumbnailPath;
      }

      return null;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return null;
    }
  }

  async deleteFile(filePath, thumbnailPath = null) {
    try {
      if (await this.fileExists(filePath)) {
        await fs.unlink(filePath);
      }
      if (thumbnailPath && await this.fileExists(thumbnailPath)) {
        await fs.unlink(thumbnailPath);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = new FileHandler();