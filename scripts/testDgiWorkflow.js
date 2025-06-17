#!/usr/bin/env node

/**
 * Script de test du workflow DGI - Cas d'usage complet
 * Simule la transmission et validation d'un document de recouvrement
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

// Simulation du workflow complet
async function testDgiWorkflow() {
  const t = await sequelize.transaction();
  
  try {
    console.log('🧪 DÉBUT DU TEST DU WORKFLOW DGI');
    console.log('=====================================\n');

    // 1. 📄 ÉTAPE 1: Agent Secrétariat trouve un document via recherche
    console.log('📋 ÉTAPE 1: Saisie/Scan Initial');
    console.log('👤 Acteur: Agent Secrétariat');
    
    // Obtenir l'utilisateur secrétariat et la première étape
    const secretariat = await User.findOne({
      where: { Email: 'secretariat@dgi.gov' },
      include: [{ model: Role, through: { attributes: [] } }]
    });
    
    const etapeInitiale = await Etape.findOne({
      where: { LibelleEtape: 'Saisie/Scan Initial' },
      include: [{ model: TypeProjet, as: 'typeProjets' }]
    });

    // Simuler la création d'un document trouvé via recherche
    const documentRecouvrement = await Document.create({
      Title: 'Avis de Recouvrement - Entreprise SARL ABC - 2024',
      etapeId: etapeInitiale.idEtape,
      status: 'pending',
      transferStatus: 'pending',
      UserDestinatorName: 'Directeur Général DGI',
      url: 'http://localhost:3000/documents/recouvrement_abc_2024.pdf'
    }, { transaction: t });

    console.log(`✅ Document créé: ${documentRecouvrement.Title}`);
    console.log(`📍 Étape actuelle: ${etapeInitiale.LibelleEtape}`);
    
    // Agent ajoute un commentaire initial
    await Commentaire.create({
      Contenu: 'Document de recouvrement scanné et indexé. Montant: 25,000 €. Urgence: Normale. Prêt pour validation DGI.',
      documentId: documentRecouvrement.idDocument,
      userId: secretariat.idUser
    }, { transaction: t });

    console.log('💬 Commentaire initial ajouté');
    console.log('📤 Document transmis vers Validation DGI\n');

    // 2. 🏛️ ÉTAPE 2: Directeur Général DGI
    console.log('📋 ÉTAPE 2: Validation DGI');
    console.log('👤 Acteur: Directeur Général des Impôts');
    
    const dgiDirecteur = await User.findOne({
      where: { Email: 'directeur.general@dgi.gov' }
    });
    
    const etapeValidationDgi = await Etape.findOne({
      where: { LibelleEtape: 'Validation DGI' }
    });

    // DGI valide et annote le document
    await documentRecouvrement.update({
      etapeId: etapeValidationDgi.idEtape,
      transferStatus: 'received',
      UserDestinatorName: 'Directeur du Recouvrement'
    }, { transaction: t });

    await Commentaire.create({
      Contenu: 'Document validé. Annotations DGI: Prioriser ce dossier - entreprise récidiviste. Appliquer procédure renforcée. Délai maximum: 15 jours.',
      documentId: documentRecouvrement.idDocument,
      userId: dgiDirecteur.idUser
    }, { transaction: t });

    console.log('✅ Document validé par DGI avec annotations');
    console.log('📤 Document transmis vers Directeur du Recouvrement\n');

    // 3. 📊 ÉTAPE 3: Directeur du Recouvrement
    console.log('📋 ÉTAPE 3: Analyse Directeur Recouvrement');
    console.log('👤 Acteur: Directeur du Recouvrement');
    
    const directeurRecouvrement = await User.findOne({
      where: { Email: 'directeur.recouvrement@dgi.gov' }
    });
    
    const etapeDirecteurRecouv = await Etape.findOne({
      where: { LibelleEtape: 'Analyse Directeur Recouvrement' }
    });

    await documentRecouvrement.update({
      etapeId: etapeDirecteurRecouv.idEtape,
      UserDestinatorName: 'Sous-Directeur'
    }, { transaction: t });

    await Commentaire.create({
      Contenu: 'Analyse terminée. Orientations: 1) Vérifier historique paiements 2) Calculer pénalités de retard 3) Proposer échéancier si solvabilité confirmée. Assigner au Sous-Directeur Martin.',
      documentId: documentRecouvrement.idDocument,
      userId: directeurRecouvrement.idUser
    }, { transaction: t });

    console.log('✅ Analyse effectuée avec orientations détaillées');
    console.log('📤 Document transmis vers Sous-Directeur\n');

    // 4. 📋 ÉTAPE 4: Sous-Directeur
    console.log('📋 ÉTAPE 4: Traitement Sous-Directeur');
    console.log('👤 Acteur: Sous-Directeur');
    
    const sousDirecteur = await User.findOne({
      where: { Email: 'sous.directeur@dgi.gov' }
    });
    
    const etapeSousDirecteur = await Etape.findOne({
      where: { LibelleEtape: 'Traitement Sous-Directeur' }
    });

    await documentRecouvrement.update({
      etapeId: etapeSousDirecteur.idEtape,
      UserDestinatorName: 'Cadre Recouvrement'
    }, { transaction: t });

    await Commentaire.create({
      Contenu: 'Instructions pour traitement: Collaborateur désigné: Agent Dubois. Actions requises: Convocation entreprise sous 5 jours, proposition amiable en priorité. Si refus, engager procédure contentieuse.',
      documentId: documentRecouvrement.idDocument,
      userId: sousDirecteur.idUser
    }, { transaction: t });

    console.log('✅ Instructions détaillées données au collaborateur');
    console.log('📤 Document transmis vers Cadre Recouvrement\n');

    // 5. 👔 ÉTAPE 5: Collaborateur/Cadre
    console.log('📋 ÉTAPE 5: Traitement Collaborateur');
    console.log('👤 Acteur: Cadre Recouvrement');
    
    const cadreRecouvrement = await User.findOne({
      where: { Email: 'cadre.recouvrement@dgi.gov' }
    });

    // Simulation de deux scénarios possibles
    const scenarios = ['validation', 'rejet'];
    const scenarioChoisi = scenarios[Math.floor(Math.random() * scenarios.length)];
    
    if (scenarioChoisi === 'validation') {
      await documentRecouvrement.update({
        status: 'verified',
        transferStatus: 'viewed'
      }, { transaction: t });

      await Commentaire.create({
        Contenu: 'VALIDATION - Analyse terminée. Projet de réponse élaboré: Proposition échéancier sur 12 mois avec garanties. Entreprise contactée, accord de principe obtenu. Dossier prêt pour signature DGI.',
        documentId: documentRecouvrement.idDocument,
        userId: cadreRecouvrement.idUser
      }, { transaction: t });

      console.log('✅ VALIDATION: Projet de réponse favorable élaboré');
      console.log('🔄 Retour vers DGI pour signature finale');
      
    } else {
      await documentRecouvrement.update({
        status: 'rejected'
      }, { transaction: t });

      await Commentaire.create({
        Contenu: 'REJET - Analyse révèle: Entreprise en liquidation judiciaire depuis 3 mois. Aucun actif saisissable identifié. Recommandation: Classer sans suite et radier créance. Projet de rejet prêt pour signature DGI.',
        documentId: documentRecouvrement.idDocument,
        userId: cadreRecouvrement.idUser
      }, { transaction: t });

      console.log('❌ REJET: Dossier non recouvrable');
      console.log('🔄 Retour vers DGI pour validation du rejet');
    }

    // 6. 📊 RÉSUMÉ FINAL
    console.log('\n🎯 WORKFLOW TERMINÉ - RÉSUMÉ COMPLET');
    console.log('=====================================');
      // Récupérer l'historique complet
    const documentFinal = await Document.findOne({
      where: { idDocument: documentRecouvrement.idDocument },
      include: [
        { 
          model: Commentaire, 
          as: 'commentaires',
          include: [{ model: User, as: 'user', attributes: ['NomUser', 'PrenomUser', 'Email'] }]
        },
        { model: Etape, as: 'etape' }
      ],
      order: [['commentaires', 'createdAt', 'ASC']],
      transaction: t
    });

    console.log(`📄 Document: ${documentFinal.Title}`);
    console.log(`📊 Statut final: ${documentFinal.status.toUpperCase()}`);
    console.log(`⏱️  Durée du workflow: ${Math.floor((new Date() - documentFinal.createdAt) / 1000)} secondes`);
    console.log('\n📝 HISTORIQUE DES ACTIONS:');
    
    documentFinal.commentaires.forEach((comment, index) => {
      console.log(`${index + 1}. ${comment.user.PrenomUser} ${comment.user.NomUser} (${comment.user.Email})`);
      console.log(`   💬 "${comment.Contenu}"`);
      console.log(`   🕐 ${comment.createdAt.toLocaleString()}\n`);
    });

    console.log('✅ BÉNÉFICES DÉMONTRÉS:');
    console.log('• ✓ Suivi temps réel du cheminement');
    console.log('• ✓ Traçabilité complète des décisions'); 
    console.log('• ✓ Réduction du risque de perte');
    console.log('• ✓ Centralisation des annotations');
    console.log('• ✓ Horodatage de toutes les actions');
    console.log('• ✓ Fluidification du circuit administratif');

    await t.commit();
    console.log('\n🎉 TEST DU WORKFLOW DGI RÉUSSI !\n');
    
    return {
      success: true,
      documentId: documentRecouvrement.idDocument,
      finalStatus: documentFinal.status,
      scenario: scenarioChoisi,
      commentsCount: documentFinal.commentaires.length
    };

  } catch (error) {
    await t.rollback();
    console.error('❌ Erreur lors du test:', error);
    throw error;
  }
}

// Exécution du test
async function runTest() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion base de données établie\n');
    
    const result = await testDgiWorkflow();
    
    console.log('📋 RÉSULTAT DU TEST:');
    console.log(`• Document ID: ${result.documentId}`);
    console.log(`• Statut final: ${result.finalStatus}`);
    console.log(`• Scénario testé: ${result.scenario}`);
    console.log(`• Nombre d'actions: ${result.commentsCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Test échoué:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runTest();
}

module.exports = { testDgiWorkflow };
