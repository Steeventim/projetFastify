const axios = require('axios');
const { Document } = require('../models'); // Assuming you have a Document model

const searchController = {
  searchDocuments: async (request, reply) => {
    const { documentName, searchTerm } = request.params; // Extracting from request parameters

    if (!documentName || !searchTerm) {
      return reply.status(400).send({ error: 'Document name and search term are required' });
    }

    try {
      // Check if the document exists in the database
      let document = await Document.findOne({ where: { Title: documentName } });

      if (!document) {
        // Construct the URL with the document name and search term
        const url = `http://localhost:3001/highlightera2/${documentName}/${searchTerm}`; // Update the hostname and port as needed

        // Make a request to the external API
        const response = await axios.get(url);

        // Log the response to see its structure
        console.log('External API response:', response.data);

        // Store the new document in the database
        document = await Document.create({
          Title: documentName,
          content: response.data, // Assuming the response contains the document content
          status: 'active' // Provide a value for the status field
        });
      }

      // Always fetch the document from the external API based on the search term
      const pdfUrl = `http://localhost:3001/highlightera2/${documentName}/${searchTerm}`; // Update the hostname and port as needed
      return reply.from(pdfUrl);
    } catch (error) {
      console.error('Error searching documents:', error.message);
      return reply.status(500).send({ error: 'Error searching documents', details: error.message });
    }
  }
};

module.exports = searchController;