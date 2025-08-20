require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const { io } = require('socket.io-client');

const SERVER_URL = `http://localhost:${process.env.PORT || 3003}`;

// Using credentials from the seeding script
const SENDER_EMAIL = 'secretariat@dgi.gov';
const SENDER_PASSWORD = 'SecretariatDGI2024!';
const RECEIVER_EMAIL = 'directeur.general@dgi.gov';
const RECEIVER_PASSWORD = 'DirecteurDGI2024!';

async function login(email, password) {
  console.log(`Attempting to log in as ${email}...`);
  try {
    const response = await axios.post(`${SERVER_URL}/users/login`, {
      Email: email,
      Password: password,
    });
    console.log(`✔ Login successful for ${email}.`);
    return response.data;
  } catch (error) {
    console.error(`❌ Login failed for ${email}.`);
    if (error.response) {
      console.error(`Status: ${error.response.status}, Message: ${JSON.stringify(error.response.data)}`);
    }
    if (error.message) {
      console.error('Error message:', error.message);
    }
    throw error;
  }
}

async function getOrCreateDocument(token, senderId, senderEtape) {
    console.log("Searching for an existing document...");
    try {
        const searchResponse = await axios.get(`${SERVER_URL}/search?q=`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (searchResponse.data.hits.length > 0) {
            const doc = searchResponse.data.hits[0];
            console.log(`✔ Found existing document: "${doc.Title}" (ID: ${doc.idDocument})`);
            return doc;
        }
    } catch (e) {
        console.log('Search endpoint might be empty or unavailable, proceeding to create a document.');
    }

    console.log("No documents found. Creating a new one for the test...");
    const newDocData = {
        title: `Realtime Test Doc ${Date.now()}`,
        type: 'Test',
        userId: senderId,
        etapeId: senderEtape.idEtape,
        content: 'This is a test document created for realtime transfer verification.'
    };
    const createDocResponse = await axios.post(`${SERVER_URL}/documents`, newDocData, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const createdDoc = createDocResponse.data.data;
    console.log(`✔ Created new document: "${createdDoc.Title}" (ID: ${createdDoc.idDocument})`);
    return createdDoc;
}


async function main() {
  let receiverSocket;

  try {
    // 1. Login as both users
    const senderAuth = await login(SENDER_EMAIL, SENDER_PASSWORD);
    const receiverAuth = await login(RECEIVER_EMAIL, RECEIVER_PASSWORD);

  const senderToken = senderAuth.token;
  const senderId = senderAuth.user.idUser;
  // Use receiver's email (unique) to identify the destinator on the server
  const receiverName = receiverAuth.user.email || receiverAuth.user.Email || receiverAuth.user.nomUser || receiverAuth.user.NomUser;

    // 2. Set up the receiver's socket to listen for the event
    console.log(`\n🎧 Setting up WebSocket listener for receiver: ${RECEIVER_EMAIL}`);
    const socketOptions = { transports: ['websocket'], forceNew: true };
    receiverSocket = io(SERVER_URL, { ...socketOptions, auth: { token: receiverAuth.token } });

    const transferPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Test timed out. Did not receive "document_transferred" event.')), 15000);
      
      receiverSocket.on('connect', () => {
        console.log(`✔ Receiver socket connected successfully (ID: ${receiverSocket.id})`);
      });

      receiverSocket.on('document_transferred', (payload) => {
        console.log('\n🎉 SUCCESS! "document_transferred" event received by the receiver!');
        console.log('Payload content:');
        console.log(JSON.stringify(payload, null, 2));
        clearTimeout(timeout);
        resolve(payload);
      });

      receiverSocket.on('connect_error', (err) => {
        console.error('❌ Receiver socket connection error:', err.message);
        clearTimeout(timeout);
        reject(err);
      });
    });
    
    // Allow a moment for the socket to establish connection
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Get a valid "etape" for the sender by looking up etapes for the sender's role(s)
    console.log(`\n🔎 Fetching workflow steps (etapes) suitable for sender: ${SENDER_EMAIL}`);
    let senderEtape = null;
    try {
      const roleNames = Array.isArray(senderAuth.user.roles) ? senderAuth.user.roles.map(r => r.name) : [];
      for (const roleName of roleNames) {
        try {
          const roleEtapesResp = await axios.get(`${SERVER_URL}/etapes/role/${encodeURIComponent(roleName)}`, {
            headers: { Authorization: `Bearer ${senderToken}` },
          });
          const roleEtapes = roleEtapesResp.data.data || roleEtapesResp.data || [];
          if (Array.isArray(roleEtapes) && roleEtapes.length > 0) {
            senderEtape = roleEtapes[0];
            break;
          }
        } catch (e) {
          // ignore and try next role
        }
      }
    } catch (e) {
      // ignore
    }

    if (!senderEtape) {
      // fallback to /etapes/all
      const etapesResponse = await axios.get(`${SERVER_URL}/etapes/all`, {
        headers: { Authorization: `Bearer ${senderToken}` },
      });
      const etapes = etapesResponse.data.data || [];
      if (etapes.length === 0) {
        throw new Error('No etapes returned from /etapes/all');
      }
      senderEtape = etapes.find((e) => (e.LibelleEtape || '').toLowerCase().includes('secr') ) || etapes[0];
    }
    console.log(`✔ Selected etape: "${senderEtape.LibelleEtape}" (ID: ${senderEtape.idEtape})`);
    // Fetch full etape details to inspect roleId and other metadata
    try {
      const etapeDetailResp = await axios.get(`${SERVER_URL}/etapes/${encodeURIComponent(senderEtape.idEtape)}`, {
        headers: { Authorization: `Bearer ${senderToken}` },
      });
      console.log('Selected etape details:', JSON.stringify(etapeDetailResp.data, null, 2));
    } catch (e) {
      console.log('Could not fetch etape details:', e.message);
    }

    // 4. Get or create a document to forward
  const documentToForward = await getOrCreateDocument(senderToken, senderId, senderEtape);
  console.log('Document to forward id:', documentToForward.idDocument, 'type:', typeof documentToForward.idDocument);

    // 5. Perform the document forward action
    console.log(`\n🚀 Forwarding document from ${SENDER_EMAIL} to ${receiverName}...`);
  const formData = new FormData();
  // Ensure values are strings for multipart/form-data
  formData.append('documentId', String(documentToForward.idDocument));
  formData.append('userId', String(senderId));
  formData.append('etapeId', String(senderEtape.idEtape));
  formData.append('UserDestinatorName', String(receiverName));
    formData.append('comments[0][content]', 'This is a test comment for the realtime forward verification.');

    await axios.post(`${SERVER_URL}/forward-document`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${senderToken}`,
      },
    });
    console.log('✔ Document forward API request sent successfully.');

    // 6. Wait for the promise to resolve (i.e., for the socket event to be received)
    await transferPromise;

  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    if (error.response) {
      console.error(`API Error - Status: ${error.response.status}`);
      console.error(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  } finally {
    if (receiverSocket) receiverSocket.disconnect();
    console.log('\nTest finished. Sockets disconnected.');
  }
}

main();
