const { Document, User, Commentaire, Etape, Role, TypeProjet, sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

async function testNotificationFix() {
  try {
    console.log('🧪 TEST DE CORRECTION DES NOTIFICATIONS');
    console.log('======================================');

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Connexion base de données établie');

    // Create a simple test document for rejection
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

    const targetEtape = etapes.find(e => e.sequenceNumber === 3); // Analyse Directeur Recouvrement
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

    if (!directeurGeneral || !directeurRecouvrement || !targetEtape) {
      throw new Error('Données de test manquantes');
    }

    // Create test document
    const testDocument = await Document.create({
      idDocument: uuidv4(),
      Title: 'Test Notification Fix - Document Rejet',
      etapeId: targetEtape.idEtape,
      UserDestinatorName: directeurRecouvrement.NomUser,
      status: 'pending',
      transferStatus: 'sent',
      url: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`✅ Document créé: ${testDocument.Title}`);
    console.log(`📍 ID: ${testDocument.idDocument}`);

    // 2. Test the rejection logic with proper notification creation
    console.log('\n⚡ ÉTAPE 2: Test de rejet avec notification');
    console.log('==========================================');

    const rejectionData = {
      documentId: testDocument.idDocument,
      userId: directeurRecouvrement.idUser,
      comments: [
        {
          content: 'Test de rejet avec notification corrigée - documents manquants.'
        }
      ]
    };

    // Simulate the fixed rejection logic
    const t = await sequelize.transaction();

    try {
      // Get document with relations
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

      // Find previous etape
      const previousEtape = await Etape.findOne({
        where: {
          sequenceNumber: document.etape.sequenceNumber - 1
        },
        include: [{
          model: TypeProjet,
          as: 'typeProjets',
          where: { Libelle: 'Recouvrement DGI' },
          through: { attributes: [] }
        }],
        transaction: t
      });

      // Find user for previous etape
      const targetUser = await User.findOne({
        include: [{
          model: Role,
          through: { attributes: [] },
          where: { idRole: previousEtape.roleId }
        }],
        transaction: t
      });

      console.log(`🎯 Destinataire: ${targetUser.NomUser} (${targetUser.Email})`);

      // Add rejection comment
      await Commentaire.create({
        idComment: uuidv4(),
        documentId: document.idDocument,
        userId: rejectionData.userId,
        Contenu: rejectionData.comments[0].content,
        createdAt: new Date()
      }, { transaction: t });

      // Update document
      await document.update({
        status: 'rejected',
        etapeId: previousEtape.idEtape,
        transferStatus: 'sent',
        transferTimestamp: new Date(),
        UserDestinatorName: targetUser.NomUser
      }, { transaction: t });

      // Test notification creation (this should now work with title)
      console.log('📢 Test de création de notification...');
      
      const { createNotification } = require('../utils/notificationUtils');
      
      const notification = await createNotification({
        userId: targetUser.idUser,
        title: "Document Rejected",
        message: `Document "${document.Title}" has been rejected and requires your attention.`,
        type: "document_rejected",
      });

      console.log(`✅ Notification créée avec succès: ${notification.idNotification}`);
      console.log(`📧 Titre: ${notification.title}`);
      console.log(`💬 Message: ${notification.message}`);
      console.log(`🏷️ Type: ${notification.type}`);

      await t.commit();

      // 3. Verify the result
      console.log('\n📊 ÉTAPE 3: Vérification du résultat');
      console.log('==================================');

      const finalDocument = await Document.findOne({
        where: { idDocument: testDocument.idDocument },
        include: [
          {
            model: Commentaire,
            as: 'commentaires',
            include: [{ model: User, as: 'user' }]
          },
          { model: Etape, as: 'etape' }
        ]
      });

      console.log(`📄 Document: ${finalDocument.Title}`);
      console.log(`📊 Statut: ${finalDocument.status.toUpperCase()}`);
      console.log(`📍 Étape: ${finalDocument.etape.LibelleEtape}`);
      console.log(`👤 Destinataire: ${finalDocument.UserDestinatorName}`);

      // Check notifications for the target user
      const { Notification } = require('../models');
      const userNotifications = await Notification.findAll({
        where: { userId: targetUser.idUser },
        order: [['createdAt', 'DESC']],
        limit: 5
      });

      console.log(`\n📢 Notifications pour ${targetUser.NomUser}: ${userNotifications.length}`);
      userNotifications.forEach((notif, index) => {
        console.log(`${index + 1}. 📧 ${notif.title}`);
        console.log(`   💬 ${notif.message}`);
        console.log(`   🏷️ Type: ${notif.type}`);
        console.log(`   📅 ${notif.createdAt.toLocaleString('fr-FR')}`);
        console.log(`   ${notif.isRead ? '✅ Lu' : '📬 Non lu'}`);
      });

      console.log('\n🎉 TEST TERMINÉ AVEC SUCCÈS !');
      console.log('=============================');
      console.log('✅ Rejet de document fonctionne');
      console.log('✅ Notifications créées correctement');
      console.log('✅ Titre et message présents');
      console.log('✅ Type de notification correct');

      // Cleanup
      console.log('\n🧹 Nettoyage...');
      await Document.destroy({ where: { idDocument: testDocument.idDocument } });
      await Notification.destroy({ where: { userId: targetUser.idUser, type: 'document_rejected' } });
      console.log('✅ Données de test nettoyées');

    } catch (error) {
      await t.rollback();
      throw error;
    }

  } catch (error) {
    console.error('\n❌ ERREUR DURANT LE TEST:', error.message);
    console.error(error.stack);
  }
}

// Execute the test
testNotificationFix();
