const path = require('path');

module.exports = {
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'),
  
  ALLOWED_MIME_TYPES: {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif'
  },

  FILE_SIZE_LIMITS: {
    pdf: 10 * 1024 * 1024,    // 10MB
    doc: 5 * 1024 * 1024,     // 5MB
    docx: 5 * 1024 * 1024,    // 5MB
    xls: 5 * 1024 * 1024,     // 5MB
    xlsx: 5 * 1024 * 1024,    // 5MB
    ppt: 10 * 1024 * 1024,    // 10MB
    pptx: 10 * 1024 * 1024,   // 10MB
    jpg: 5 * 1024 * 1024,     // 5MB
    jpeg: 5 * 1024 * 1024,    // 5MB
    png: 5 * 1024 * 1024,     // 5MB
    gif: 5 * 1024 * 1024      // 5MB
  },

  getExtension: function(mimeType) {
    return this.ALLOWED_MIME_TYPES[mimeType];
  },

  isAllowedMimeType: function(mimeType) {
    return Object.keys(this.ALLOWED_MIME_TYPES).includes(mimeType);
  },

  getHumanReadableSize: function(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  }
}
