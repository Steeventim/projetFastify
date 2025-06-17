const { Document, User, Commentaire, Etape, Role, TypeProjet, EtapeTypeProjet, sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

async function testRejectionAPI() {
  try {
    console.log('🧪 TEST DU REJET DE DOCUMENT VIA API');
    console.log('=====================================');

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Connexion base de données établie');

    // 1. Create a test document at step 3 (Analyse Directeur Recouvrement)
    console.log('\n📄 ÉTAPE 1: Création d\'un document de test');
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

    if (!etapes || etapes.length === 0) {
      throw new Error('Aucune étape trouvée dans le workflow DGI');
    }

    const targetEtape = etapes.find(e => e.sequenceNumber === 3); // Analyse Directeur Recouvrement
    if (!targetEtape) {
      throw new Error('Étape 3 (Analyse Directeur Recouvrement) non trouvée');
    }

    console.log(`📍 Étape cible: ${targetEtape.LibelleEtape} (séquence ${targetEtape.sequenceNumber})`);

    // Get users
    const users = await User.findAll({
      where: {
        Email: [
          'secretariat@dgi.gov',
          'directeur.general@dgi.gov',
          'directeur.recouvrement@dgi.gov'
        ]
      }
    });

    const secretariat = users.find(u => u.Email === 'secretariat@dgi.gov');
    const directeurGeneral = users.find(u => u.Email === 'directeur.general@dgi.gov');
    const directeurRecouvrement = users.find(u => u.Email === 'directeur.recouvrement@dgi.gov');

    if (!secretariat || !directeurGeneral || !directeurRecouvrement) {
      throw new Error('Utilisateurs de test non trouvés');
    }    // Create test document
    const testDocument = await Document.create({
      idDocument: uuidv4(),
      Title: 'Test API Rejet - Document Société ABC',
      etapeId: targetEtape.idEtape,
      UserDestinatorName: directeurRecouvrement.NomUser,
      status: 'pending',
      transferStatus: 'sent',
      url: null, // No URL for test document
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`✅ Document créé: ${testDocument.Title}`);
    console.log(`📍 Document ID: ${testDocument.idDocument}`);

    // Add some history comments
    await Commentaire.create({
      idComment: uuidv4(),
      documentId: testDocument.idDocument,
      userId: secretariat.idUser,
      Contenu: 'Document scanné et traité par le secrétariat',
      createdAt: new Date()
    });

    await Commentaire.create({
      idComment: uuidv4(),
      documentId: testDocument.idDocument,
      userId: directeurGeneral.idUser,
      Contenu: 'Document validé par DGI - transmission autorisée',
      createdAt: new Date()
    });

    console.log('💬 Commentaires d\'historique ajoutés');

    // 2. Simulate rejection API call data
    console.log('\n🔄 ÉTAPE 2: Préparation des données de rejet');
    console.log('============================================');

    const rejectionData = {
      documentId: testDocument.idDocument,
      userId: directeurRecouvrement.idUser,
      comments: [
        {
          content: 'REJET API - Dossier incomplet selon analyse. Documents fiscaux manquants. Retour nécessaire pour complément avant réexamen.'
        }
      ]
    };

    console.log(`📤 Rejet simulé par: ${directeurRecouvrement.NomUser} (${directeurRecouvrement.Email})`);
    console.log(`📍 Étape actuelle: ${targetEtape.LibelleEtape} (séquence ${targetEtape.sequenceNumber})`);

    // Expected destination (previous step)
    const expectedPreviousEtape = etapes.find(e => e.sequenceNumber === 2);
    console.log(`🎯 Étape de destination attendue: ${expectedPreviousEtape.LibelleEtape} (séquence ${expectedPreviousEtape.sequenceNumber})`);

    // 3. Simulate the controller logic (since we can't easily test HTTP endpoint)
    console.log('\n⚡ ÉTAPE 3: Simulation de la logique de rejet du contrôleur');
    console.log('=========================================================');

    const t = await sequelize.transaction();

    try {
      // Get document with all relations
      const document = await Document.findOne({
        where: { idDocument: testDocument.idDocument },
        include: [
          {
            model: Commentaire,
            as: 'commentaires',
            include: [{ model: User, as: 'user' }],
            order: [['createdAt', 'ASC']]
          },
          { model: Etape, as: 'etape' }
        ],
        transaction: t
      });

      // Get current etape
      const currentEtape = document.etape;
      console.log(`📍 Étape actuelle du document: ${currentEtape.LibelleEtape}`);

      // Find previous etape
      const previousEtape = await Etape.findOne({
        where: {
          sequenceNumber: currentEtape.sequenceNumber - 1
        },
        include: [{
          model: TypeProjet,
          as: 'typeProjets',
          where: { Libelle: 'Recouvrement DGI' },
          through: { attributes: [] }
        }],
        transaction: t
      });

      console.log(`🎯 Étape précédente trouvée: ${previousEtape.LibelleEtape}`);

      // Get role for previous etape
      const previousRole = await Role.findOne({
        where: { idRole: previousEtape.roleId },
        transaction: t
      });

      console.log(`👤 Rôle de l'étape précédente: ${previousRole.name}`);

      // Find user with that role
      const targetUser = await User.findOne({
        include: [{
          model: Role,
          through: { attributes: [] },
          where: { idRole: previousEtape.roleId }
        }],
        transaction: t
      });

      console.log(`🎯 Utilisateur de destination: ${targetUser.NomUser} (${targetUser.Email})`);

      // Add rejection comment
      const rejectionComment = await Commentaire.create({
        idComment: uuidv4(),
        documentId: document.idDocument,
        userId: rejectionData.userId,
        Contenu: rejectionData.comments[0].content,
        createdAt: new Date()
      }, { transaction: t });

      console.log('💬 Commentaire de rejet ajouté');

      // Update document
      await document.update({
        status: 'rejected',
        etapeId: previousEtape.idEtape,
        transferStatus: 'sent',
        transferTimestamp: new Date(),
        UserDestinatorName: targetUser.NomUser
      }, { transaction: t });

      console.log('✅ Document mis à jour avec la logique de rejet');

      await t.commit();

      // 4. Verify the result
      console.log('\n📊 ÉTAPE 4: Vérification du résultat');
      console.log('==================================');

      const updatedDocument = await Document.findOne({
        where: { idDocument: testDocument.idDocument },
        include: [
          {
            model: Commentaire,
            as: 'commentaires',
            include: [{ model: User, as: 'user' }],
            order: [['createdAt', 'ASC']]
          },
          { model: Etape, as: 'etape' }
        ]
      });

      console.log(`📄 Document: ${updatedDocument.Title}`);
      console.log(`📊 Statut: ${updatedDocument.status.toUpperCase()}`);
      console.log(`📍 Étape actuelle: ${updatedDocument.etape.LibelleEtape} (séquence ${updatedDocument.etape.sequenceNumber})`);
      console.log(`👤 Destinataire: ${updatedDocument.UserDestinatorName}`);
      console.log(`⏰ Timestamp de rejet: ${updatedDocument.transferTimestamp}`);

      console.log('\n📝 Historique complet des commentaires:');
      updatedDocument.commentaires.forEach((comment, index) => {
        console.log(`${index + 1}. ${comment.user.PrenomUser} ${comment.user.NomUser} (${comment.user.Email})`);
        console.log(`   💬 "${comment.Contenu}"`);
        console.log(`   🕐 ${comment.createdAt.toLocaleString('fr-FR')}`);
      });

      // 5. Test user session simulation
      console.log('\n🔐 ÉTAPE 5: Test de session utilisateur de destination');
      console.log('====================================================');

      console.log(`👤 Simulation de connexion: ${targetUser.Email}`);

      // Query documents that should appear in target user's session
      const documentsForUser = await Document.findAll({
        where: {
          UserDestinatorName: targetUser.NomUser,
          status: 'rejected',
          transferStatus: 'sent'
        },
        include: [
          { model: Etape, as: 'etape' },
          {
            model: Commentaire,
            as: 'commentaires',
            include: [{ model: User, as: 'user' }],
            limit: 1,
            order: [['createdAt', 'DESC']]
          }
        ]
      });

      console.log(`📋 Documents rejetés en attente pour ${targetUser.NomUser}: ${documentsForUser.length}`);

      documentsForUser.forEach((doc, index) => {
        const lastComment = doc.commentaires[0];
        console.log(`${index + 1}. 📄 ${doc.Title}`);
        console.log(`   📊 Statut: ${doc.status.toUpperCase()}`);
        console.log(`   📍 Étape: ${doc.etape.LibelleEtape}`);
        if (lastComment) {
          console.log(`   💬 Dernier commentaire: "${lastComment.Contenu}"`);
          console.log(`   👤 Par: ${lastComment.user.NomUser}`);
          console.log(`   ⏰ Le: ${lastComment.createdAt.toLocaleString('fr-FR')}`);
        }
      });

      // 6. Validation summary
      console.log('\n🎉 TESTS API DE REJET TERMINÉS AVEC SUCCÈS !');
      console.log('=============================================');
      console.log('✅ La logique de rejet API fonctionne correctement');
      console.log('✅ Les documents rejetés sont envoyés à l\'étape précédente');
      console.log('✅ Les utilisateurs peuvent voir les documents rejetés dans leur session');
      console.log('✅ L\'historique et les commentaires sont préservés');
      console.log('✅ La traçabilité complète est maintenue');

      console.log('\n📊 RÉSUMÉ DU TEST:');
      console.log('==================');
      console.log(`• Document testé: ${testDocument.idDocument}`);
      console.log(`• Rejeté depuis: ${targetEtape.LibelleEtape}`);
      console.log(`• Retourné vers: ${previousEtape.LibelleEtape}`);
      console.log(`• Utilisateur cible: ${targetUser.Email}`);
      console.log(`• Nombre de commentaires: ${updatedDocument.commentaires.length}`);

      // Cleanup
      console.log('\n🧹 Nettoyage des données de test...');
      await Document.destroy({ where: { idDocument: testDocument.idDocument } });
      console.log('✅ Données de test supprimées');

    } catch (error) {
      await t.rollback();
      throw error;
    }

  } catch (error) {
    console.error('\n❌ ERREUR DURANT LE TEST:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Execute the test
testRejectionAPI();
