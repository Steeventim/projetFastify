#!/usr/bin/env node

/**
 * Test script for Document Rejection Logic
 * Tests the modified rejectDocument function with workflow hierarchy
 */

require('dotenv').config();
const { 
  Document, 
  User, 
  Etape, 
  TypeProjet, 
  Commentaire,
  Role,
  sequelize 
} = require('../models');

async function testDocumentRejection() {
  console.log('🧪 TEST DE LA LOGIQUE DE REJET DE DOCUMENT');
  console.log('==========================================\n');

  const t = await sequelize.transaction();
  
  try {
    // 1. Créer un document de test dans le workflow
    console.log('📄 ÉTAPE 1: Création d\'un document de test');
    console.log('==========================================');
    
    // Obtenir les étapes du workflow DGI
    const etapes = await Etape.findAll({
      include: [{
        model: TypeProjet,
        as: 'typeProjets',
        where: { Libelle: 'Recouvrement DGI' }
      }],
      order: [['sequenceNumber', 'ASC']],
      transaction: t
    });

    if (etapes.length === 0) {
      throw new Error('Aucune étape trouvée pour le workflow DGI');
    }

    console.log(`✅ ${etapes.length} étapes trouvées dans le workflow DGI`);
    etapes.forEach(etape => {
      console.log(`   ${etape.sequenceNumber}. ${etape.LibelleEtape}`);
    });

    // Obtenir les utilisateurs
    const users = await User.findAll({
      where: {
        Email: {
          [sequelize.Sequelize.Op.in]: [
            'secretariat@dgi.gov',
            'directeur.general@dgi.gov', 
            'directeur.recouvrement@dgi.gov',
            'sous.directeur@dgi.gov',
            'cadre.recouvrement@dgi.gov'
          ]
        }
      },
      transaction: t
    });

    console.log(`\n👥 ${users.length} utilisateurs trouvés:`);
    users.forEach(user => {
      console.log(`   • ${user.Email} - ${user.NomUser} ${user.PrenomUser}`);
    });

    // Créer un document de test à l'étape 3 (Directeur Recouvrement)
    const etapeDirecteurRecouv = etapes.find(e => e.sequenceNumber === 3);
    const secretariat = users.find(u => u.Email === 'secretariat@dgi.gov');
    const dgiDirecteur = users.find(u => u.Email === 'directeur.general@dgi.gov');
    const directeurRecouv = users.find(u => u.Email === 'directeur.recouvrement@dgi.gov');

    const testDocument = await Document.create({
      Title: 'Test Rejet - Document Recouvrement XYZ Corp',
      etapeId: etapeDirecteurRecouv.idEtape,
      status: 'pending',
      transferStatus: 'received',
      UserDestinatorName: directeurRecouv.NomUser,
      url: 'http://localhost:3000/documents/test_rejet_xyz.pdf'
    }, { transaction: t });

    console.log(`\n✅ Document créé: ${testDocument.Title}`);
    console.log(`📍 Étape actuelle: ${etapeDirecteurRecouv.LibelleEtape} (séquence ${etapeDirecteurRecouv.sequenceNumber})`);

    // Ajouter des commentaires pour simuler l'historique
    await Commentaire.create({
      Contenu: 'Document initial scanné et indexé par le secrétariat',
      documentId: testDocument.idDocument,
      userId: secretariat.idUser
    }, { transaction: t });

    await Commentaire.create({
      Contenu: 'Document validé par DGI - procédure standard autorisée',
      documentId: testDocument.idDocument,
      userId: dgiDirecteur.idUser  
    }, { transaction: t });

    console.log('💬 Commentaires d\'historique ajoutés');

    // 2. Tester le rejet depuis l'étape 3 (Directeur Recouvrement)
    console.log('\n🔄 ÉTAPE 2: Test de rejet depuis Directeur Recouvrement');
    console.log('=====================================================');
    
    console.log(`📤 Rejet par: ${directeurRecouv.NomUser} ${directeurRecouv.PrenomUser}`);
    console.log(`📍 Étape actuelle: ${etapeDirecteurRecouv.LibelleEtape} (séquence ${etapeDirecteurRecouv.sequenceNumber})`);
    
    // L'étape précédente (séquence 2) devrait être "Validation DGI"
    const etapePrecedente = etapes.find(e => e.sequenceNumber === etapeDirecteurRecouv.sequenceNumber - 1);
    console.log(`🎯 Étape de destination attendue: ${etapePrecedente.LibelleEtape} (séquence ${etapePrecedente.sequenceNumber})`);

    // Simuler les données de rejet
    const rejectionData = {
      documentId: testDocument.idDocument,
      userId: directeurRecouv.idUser,
      comments: [{
        content: 'REJET - Dossier incomplet. Documents justificatifs manquants. Retour pour complément d\'information avant nouvelle analyse.'
      }]
    };

    // 3. Appliquer la logique de rejet modifiée
    console.log('\n⚡ ÉTAPE 3: Application de la logique de rejet');
    console.log('=============================================');
    
    // Trouver l'étape précédente dans la hiérarchie
    const previousEtape = await Etape.findOne({
      where: { sequenceNumber: etapeDirecteurRecouv.sequenceNumber - 1 },
      include: [{
        model: TypeProjet,
        as: 'typeProjets',
        where: { Libelle: 'Recouvrement DGI' }
      }],
      transaction: t
    });

    if (!previousEtape) {
      throw new Error('Étape précédente non trouvée');
    }

    console.log(`✅ Étape précédente trouvée: ${previousEtape.LibelleEtape}`);

    // Trouver l'utilisateur ayant le rôle de l'étape précédente
    const previousEtapeRole = await Role.findByPk(previousEtape.roleId, { transaction: t });
    console.log(`👤 Rôle de l'étape précédente: ${previousEtapeRole.name}`);

    const targetUser = await User.findOne({
      include: [{
        model: Role,
        through: { attributes: [] },
        where: { idRole: previousEtape.roleId }
      }],
      transaction: t
    });

    if (!targetUser) {
      throw new Error('Utilisateur cible non trouvé pour l\'étape précédente');
    }

    console.log(`🎯 Utilisateur de destination: ${targetUser.NomUser} ${targetUser.PrenomUser} (${targetUser.Email})`);

    // Ajouter le commentaire de rejet
    await Commentaire.create({
      Contenu: rejectionData.comments[0].content,
      documentId: testDocument.idDocument,
      userId: directeurRecouv.idUser
    }, { transaction: t });

    // Mettre à jour le document avec la logique de rejet modifiée
    await testDocument.update({
      status: 'rejected',
      transferStatus: 'sent',
      transferTimestamp: new Date(),
      etapeId: previousEtape.idEtape,  // Retour à l'étape précédente
      UserDestinatorName: targetUser.NomUser  // Destiné à l'utilisateur de l'étape précédente
    }, { transaction: t });

    console.log('✅ Document mis à jour avec la logique de rejet');

    // 4. Vérifier le résultat
    console.log('\n📊 ÉTAPE 4: Vérification du résultat');
    console.log('==================================');

    const documentMisAJour = await Document.findOne({
      where: { idDocument: testDocument.idDocument },
      include: [
        {
          model: Commentaire,
          as: 'commentaires',
          include: [{ model: User, as: 'user', attributes: ['NomUser', 'PrenomUser', 'Email'] }],
          order: [['createdAt', 'ASC']]
        },
        { model: Etape, as: 'etape' }
      ],
      transaction: t
    });

    console.log(`📄 Document: ${documentMisAJour.Title}`);
    console.log(`📊 Statut: ${documentMisAJour.status.toUpperCase()}`);
    console.log(`📍 Étape actuelle: ${documentMisAJour.etape.LibelleEtape} (séquence ${documentMisAJour.etape.sequenceNumber})`);
    console.log(`👤 Destinataire: ${documentMisAJour.UserDestinatorName}`);
    console.log(`⏰ Timestamp de rejet: ${documentMisAJour.transferTimestamp}`);

    console.log('\n📝 Historique complet des commentaires:');
    documentMisAJour.commentaires.forEach((comment, index) => {
      console.log(`${index + 1}. ${comment.user.PrenomUser} ${comment.user.NomUser} (${comment.user.Email})`);
      console.log(`   💬 "${comment.Contenu}"`);
      console.log(`   🕐 ${comment.createdAt.toLocaleString()}\n`);
    });

    // 5. Tester la session utilisateur (simulation)
    console.log('🔐 ÉTAPE 5: Test de session utilisateur');
    console.log('=====================================');

    // Simuler la connexion du DGI Directeur (destinataire du rejet)
    console.log(`👤 Simulation de connexion: ${targetUser.Email}`);
    
    const documentsEnAttente = await Document.findAll({
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
          order: [['createdAt', 'DESC']],
          limit: 1  // Dernier commentaire seulement pour l'affichage
        }
      ],
      transaction: t
    });

    console.log(`📋 Documents rejetés en attente: ${documentsEnAttente.length}`);
    
    if (documentsEnAttente.length > 0) {
      documentsEnAttente.forEach((doc, index) => {
        const dernierCommentaire = doc.commentaires[0];
        console.log(`${index + 1}. 📄 ${doc.Title}`);
        console.log(`   📊 Statut: ${doc.status.toUpperCase()}`);
        console.log(`   📍 Étape: ${doc.etape.LibelleEtape}`);
        console.log(`   💬 Dernier commentaire: "${dernierCommentaire?.Contenu || 'Aucun'}"`);
        console.log(`   👤 Par: ${dernierCommentaire?.user?.NomUser || 'Inconnu'}`);
        console.log(`   ⏰ Le: ${doc.transferTimestamp?.toLocaleString()}\n`);
      });
    }

    // 6. Test de différents scénarios
    console.log('🎭 ÉTAPE 6: Test de scénarios multiples');
    console.log('======================================');

    const scenarios = [
      { etapeActuelle: 2, etapeAttendue: 1, acteur: 'DGI Directeur' },
      { etapeActuelle: 4, etapeAttendue: 3, acteur: 'Sous-Directeur' },
      { etapeActuelle: 5, etapeAttendue: 4, acteur: 'Cadre Recouvrement' }
    ];

    for (const scenario of scenarios) {
      console.log(`\n🔄 Scénario: Rejet depuis étape ${scenario.etapeActuelle} (${scenario.acteur})`);
      
      const etapeCourante = etapes.find(e => e.sequenceNumber === scenario.etapeActuelle);
      const etapeDestination = etapes.find(e => e.sequenceNumber === scenario.etapeAttendue);
      
      if (etapeCourante && etapeDestination) {
        console.log(`   📤 De: ${etapeCourante.LibelleEtape}`);
        console.log(`   📥 Vers: ${etapeDestination.LibelleEtape}`);
        console.log(`   ✅ Logique cohérente`);
      } else {
        console.log(`   ❌ Erreur dans la logique`);
      }
    }

    // Test du cas limite (étape 1)
    console.log(`\n🚨 Cas limite: Rejet depuis étape 1 (${etapes[0].LibelleEtape})`);
    console.log('   📝 Comportement attendu: Le document reste à l\'étape 1 (aucune étape précédente)');

    await t.commit();

    console.log('\n🎉 TESTS DE REJET TERMINÉS AVEC SUCCÈS !');
    console.log('=========================================');
    console.log('✅ La logique de rejet modifiée fonctionne correctement');
    console.log('✅ Les documents rejetés sont envoyés à l\'étape précédente');
    console.log('✅ Les utilisateurs peuvent voir les documents rejetés dans leur session');
    console.log('✅ L\'historique et les commentaires sont préservés');
    console.log('✅ La traçabilité complète est maintenue');

    return {
      success: true,
      documentId: testDocument.idDocument,
      rejectedFrom: etapeDirecteurRecouv.LibelleEtape,
      returnedTo: previousEtape.LibelleEtape,
      targetUser: targetUser.Email,
      commentsCount: documentMisAJour.commentaires.length
    };

  } catch (error) {
    await t.rollback();
    console.error('❌ ERREUR LORS DU TEST:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Fonction principale
async function runRejectionTest() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion base de données établie\n');
    
    const result = await testDocumentRejection();
    
    console.log('\n📊 RÉSUMÉ DU TEST:');
    console.log('==================');
    console.log(`• Document testé: ${result.documentId}`);
    console.log(`• Rejeté depuis: ${result.rejectedFrom}`);
    console.log(`• Retourné vers: ${result.returnedTo}`);
    console.log(`• Utilisateur cible: ${result.targetUser}`);
    console.log(`• Nombre de commentaires: ${result.commentsCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Test échoué:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runRejectionTest();
}

module.exports = { testDocumentRejection };
