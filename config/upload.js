const path = require('path');

module.exports = {
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'),
  
  ALLOWED_MIME_TYPES: {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
  },

  FILE_SIZE_LIMITS: {
    pdf: 10 * 1024 * 1024,    // 10MB
    doc: 5 * 1024 * 1024,     // 5MB
    docx: 5 * 1024 * 1024,    // 5MB
    xls: 5 * 1024 * 1024,     // 5MB
    xlsx: 5 * 1024 * 1024     // 5MB
  },

  getExtension: (mimeType) => {
    return module.exports.ALLOWED_MIME_TYPES[mimeType];
  },

  isAllowedMimeType: (mimeType) => {
    return Object.keys(module.exports.ALLOWED_MIME_TYPES).includes(mimeType);
  }
};
