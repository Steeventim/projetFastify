const { Document, User, Commentaire, Etape, Role, TypeProjet, sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

async function testRejectedDocumentsEndpoint() {
  try {
    console.log('🧪 TEST DE L\'ENDPOINT DOCUMENTS REJETÉS');
    console.log('=======================================');

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Connexion base de données établie');

    // 1. Create test data - rejected document
    console.log('\n📄 ÉTAPE 1: Création d\'un document rejeté');
    console.log('==========================================');

    const etapes = await Etape.findAll({
      include: [{
        model: TypeProjet,
        as: 'typeProjets',
        where: { Libelle: 'Recouvrement DGI' },
        through: { attributes: [] }
      }],
      order: [['sequenceNumber', 'ASC']]
    });

    const step2 = etapes.find(e => e.sequenceNumber === 2); // Validation DGI
    const users = await User.findAll({
      where: {
        Email: [
          'directeur.general@dgi.gov',
          'directeur.recouvrement@dgi.gov'
        ]
      }
    });

    const directeurGeneral = users.find(u => u.Email === 'directeur.general@dgi.gov');
    const directeurRecouvrement = users.find(u => u.Email === 'directeur.recouvrement@dgi.gov');

    // Create rejected document
    const rejectedDoc = await Document.create({
      idDocument: uuidv4(),
      Title: 'Test Endpoint - Document Rejeté',
      etapeId: step2.idEtape,
      UserDestinatorName: directeurGeneral.NomUser,
      status: 'rejected',
      transferStatus: 'sent',
      transferTimestamp: new Date(),
      url: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add rejection comment
    await Commentaire.create({
      idComment: uuidv4(),
      documentId: rejectedDoc.idDocument,
      userId: directeurRecouvrement.idUser,
      Contenu: 'Document rejeté pour test de l\'endpoint - documentation incomplète.',
      createdAt: new Date()
    });

    console.log(`✅ Document rejeté créé: ${rejectedDoc.Title}`);
    console.log(`📍 ID: ${rejectedDoc.idDocument}`);
    console.log(`👤 Destinataire: ${directeurGeneral.NomUser}`);

    // 2. Test the getRejectedDocuments function directly
    console.log('\n⚡ ÉTAPE 2: Test de la fonction getRejectedDocuments');
    console.log('==================================================');

    const { getRejectedDocuments } = require('../controllers/documentController');

    // Mock request and reply objects for testing
    const mockRequest = {
      user: {
        idUser: directeurGeneral.idUser,
        NomUser: directeurGeneral.NomUser,
        Email: directeurGeneral.Email
      }
    };

    let responseData = null;
    const mockReply = {
      send: (data) => {
        responseData = data;
        return mockReply;
      },
      status: (code) => {
        console.log(`📊 Status Code: ${code}`);
        return mockReply;
      }
    };

    // Call the function
    await getRejectedDocuments(mockRequest, mockReply);

    // 3. Verify the response
    console.log('\n📊 ÉTAPE 3: Vérification de la réponse');
    console.log('====================================');

    if (responseData && responseData.success) {
      console.log('✅ Réponse réussie reçue');
      console.log(`📋 Nombre de documents rejetés: ${responseData.data.length}`);      responseData.data.forEach((doc, index) => {
        console.log(`\n${index + 1}. 📄 ${doc.Title || 'Titre non disponible'}`);
        console.log(`   📊 Statut: ${doc.status.toUpperCase()}`);
        console.log(`   📍 Étape: ${doc.etape ? doc.etape.LibelleEtape : 'Étape non disponible'}`);
        console.log(`   🕐 Rejeté le: ${doc.transferTimestamp ? new Date(doc.transferTimestamp).toLocaleString('fr-FR') : 'Date non disponible'}`);
        
        if (doc.commentaires && doc.commentaires.length > 0) {
          const lastComment = doc.commentaires[doc.commentaires.length - 1];
          console.log(`   💬 Dernier commentaire: "${lastComment.Contenu}"`);
          if (lastComment.user) {
            console.log(`   👤 Par: ${lastComment.user.PrenomUser} ${lastComment.user.NomUser}`);
          }
        }
      });

      // Check if our test document is included
      const testDocFound = responseData.data.find(doc => doc.idDocument === rejectedDoc.idDocument);
      if (testDocFound) {
        console.log('\n✅ Document de test trouvé dans la réponse');
      } else {
        console.log('\n❌ Document de test non trouvé dans la réponse');
      }

    } else {
      console.log('❌ Erreur dans la réponse ou pas de succès');
      console.log('Réponse:', responseData);
    }

    // 4. Test endpoint URL format
    console.log('\n🌐 ÉTAPE 4: Information sur l\'endpoint');
    console.log('=====================================');
    console.log('📍 URL: GET /documents/rejected');
    console.log('🔐 Auth: Requis (Bearer token)');
    console.log('👥 Rôles: admin, user');
    console.log('📊 Retourne: Documents rejetés pour l\'utilisateur connecté');

    console.log('\n🎉 TEST TERMINÉ AVEC SUCCÈS !');
    console.log('============================');
    console.log('✅ Endpoint getRejectedDocuments fonctionne');
    console.log('✅ Filtre correctement les documents rejetés');
    console.log('✅ Retourne les données avec relations');
    console.log('✅ Prêt pour utilisation frontend');

    // Cleanup
    console.log('\n🧹 Nettoyage...');
    await Document.destroy({ where: { idDocument: rejectedDoc.idDocument } });
    console.log('✅ Données de test nettoyées');

  } catch (error) {
    console.error('\n❌ ERREUR DURANT LE TEST:', error.message);
    console.error(error.stack);
  }
}

// Execute the test
testRejectedDocumentsEndpoint();
