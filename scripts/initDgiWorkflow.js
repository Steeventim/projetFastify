const { User, Role, UserRoles, TypeProjet, Etape, EtapeTypeProjet, sequelize } = require('../models');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

/**
 * Script d'initialisation du workflow DGI
 * 
 * USE CASE: Transmission et Validation d'un Document de Recouvrement à la DGI
 * 
 * ACTEURS PRINCIPAUX:
 * - Utilisateur Secrétariat (Scanneur ou Agent de recherche)
 * - Directeur Général des Impôts (DGI)
 * - Directeur du Recouvrement (DIR)
 * - Sous-directeur
 * - Cadre responsable du recouvrement
 * - Système (Application BPM avec moteur de recherche)
 * 
 * WORKFLOW EN 5 ÉTAPES:
 * 1. Saisie/Scan Initial - Agent secrétariat scanne/recherche et indexe le document
 * 2. Validation DGI - DGI valide et annote avec stylet, transmission au DIR
 * 3. Analyse DIR - Directeur Recouvrement analyse, annote et quote au sous-directeur
 * 4. Traitement Sous-Directeur - Sous-directeur annote et quote au collaborateur
 * 5. Traitement Collaborateur - Cadre élabore réponse, validation/rejet avec chemin inverse
 * 
 * FLUX ALTERNATIFS:
 * - Rejet: Le document reprend le chemin inverse jusqu'à signature du DGI
 * - Validation: Projet de réponse adressé au DGI pour signature
 * - Timeout: Transmission automatique au N+1 si délai dépassé
 * 
 * BÉNÉFICES:
 * - Suivi temps réel, traçabilité complète, réduction risques
 * - Centralisation décisions, fluidification circuit, horodatage/signature numérique
 */

async function initDgiWorkflow() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🚀 Début de l\'initialisation du workflow DGI...');

    // 1. Création des rôles DGI
    console.log('📋 Création des rôles DGI...');
      const roles = [
      {
        name: 'secretariat_scanneur',
        description: 'Agent du secrétariat - Scanneur ou Agent de recherche',
        isSystemRole: false,
        permissions: ['document:create', 'document:search', 'document:upload', 'document:index']
      },
      {
        name: 'dgi_directeur',
        description: 'Directeur Général des Impôts (DGI)',
        isSystemRole: false,
        permissions: ['document:read', 'document:validate', 'document:annotate', 'document:forward', 'document:sign']
      },
      {
        name: 'directeur_recouvrement',
        description: 'Directeur du Recouvrement (DIR)',
        isSystemRole: false,
        permissions: ['document:read', 'document:validate', 'document:annotate', 'document:forward', 'document:quote']
      },
      {
        name: 'sous_directeur',
        description: 'Sous-directeur',
        isSystemRole: false,
        permissions: ['document:read', 'document:validate', 'document:annotate', 'document:forward', 'document:quote']
      },
      {
        name: 'cadre_recouvrement',
        description: 'Cadre responsable du recouvrement',
        isSystemRole: false,
        permissions: ['document:read', 'document:process', 'document:annotate', 'document:validate', 'document:reject', 'document:elaborate_response']
      }
    ];

    const createdRoles = {};
    for (const roleData of roles) {
      const [role, created] = await Role.findOrCreate({
        where: { name: roleData.name },
        defaults: {
          idRole: uuidv4(),
          ...roleData
        },
        transaction
      });
      createdRoles[roleData.name] = role;
      console.log(`✅ Rôle ${roleData.name}: ${created ? 'créé' : 'existe déjà'}`);
    }

    // 2. Création du TypeProjet "Recouvrement DGI"
    console.log('📂 Création du type de projet...');
    
    const [typeProjet, typeCreated] = await TypeProjet.findOrCreate({
      where: { Libelle: 'Recouvrement DGI' },
      defaults: {
        idType: uuidv4(),
        Libelle: 'Recouvrement DGI',
        Description: 'Workflow de traitement des documents de recouvrement fiscal'
      },
      transaction
    });
    console.log(`✅ TypeProjet "Recouvrement DGI": ${typeCreated ? 'créé' : 'existe déjà'}`);

    // 3. Création des étapes du workflow
    console.log('🔄 Création des étapes du workflow...');
      const etapes = [
      {
        LibelleEtape: 'Saisie/Scan Initial',
        Description: 'L\'agent du secrétariat scanne ou recherche un document existant via le moteur de recherche intégré. Le document est identifié, indexé et injecté dans le workflow BPM.',
        sequenceNumber: 1,
        Validation: false,
        roleId: createdRoles.secretariat_scanneur.idRole
      },
      {
        LibelleEtape: 'Validation DGI',
        Description: 'Le document est transmis automatiquement au poste de la DGI, accompagné des métadonnées. Le DGI porte des annotations sur le fichier avec un stylet avant transmission au Directeur du Recouvrement.',
        sequenceNumber: 2,
        Validation: true,
        roleId: createdRoles.dgi_directeur.idRole
      },
      {
        LibelleEtape: 'Analyse Directeur Recouvrement',
        Description: 'Le Directeur du recouvrement analyse le fichier, prend connaissance des annotations du DGI. Quote le dossier au Sous-directeur en y apportant des mentions et des orientations avec un stylet.',
        sequenceNumber: 3,
        Validation: true,
        roleId: createdRoles.directeur_recouvrement.idRole
      },
      {
        LibelleEtape: 'Traitement Sous-Directeur',
        Description: 'Le Sous-directeur prend connaissance des orientations du DGI et du Directeur du Recouvrement avant de porter ses propres annotations et de quoter le dossier au collaborateur chargé de le traiter.',
        sequenceNumber: 4,
        Validation: true,
        roleId: createdRoles.sous_directeur.idRole
      },      {
        LibelleEtape: 'Traitement Collaborateur',
        Description: 'Le cadre responsable reçoit le document, l\'analyse et élabore un projet de réponse. Ce projet est transmis à la hiérarchie pour validation ou rejet. Le dossier suit le chemin inverse jusqu\'au DGI.',
        sequenceNumber: 5,
        Validation: true,
        roleId: createdRoles.cadre_recouvrement.idRole
      }
    ];

    const createdEtapes = [];
    for (const etapeData of etapes) {
      const [etape, etapeCreated] = await Etape.findOrCreate({
        where: { 
          LibelleEtape: etapeData.LibelleEtape,
          sequenceNumber: etapeData.sequenceNumber
        },
        defaults: {
          idEtape: uuidv4(),
          ...etapeData
        },
        transaction
      });
      createdEtapes.push(etape);
      console.log(`✅ Étape ${etapeData.sequenceNumber} "${etapeData.LibelleEtape}": ${etapeCreated ? 'créée' : 'existe déjà'}`);
    }

    // 4. Association des étapes au TypeProjet
    console.log('🔗 Association des étapes au type de projet...');
    
    for (const etape of createdEtapes) {
      const [association, associationCreated] = await EtapeTypeProjet.findOrCreate({
        where: {
          etapeId: etape.idEtape,
          idType: typeProjet.idType
        },
        defaults: {
          etapeId: etape.idEtape,
          idType: typeProjet.idType
        },
        transaction
      });
      console.log(`✅ Association étape "${etape.LibelleEtape}" → TypeProjet: ${associationCreated ? 'créée' : 'existe déjà'}`);
    }

    // 5. Création d'utilisateurs de test (optionnel)
    console.log('👥 Création d\'utilisateurs de test...');
    
    const testUsers = [
      {
        Email: 'secretariat@dgi.gov',
        Password: 'SecretariatDGI2024!',
        NomUser: 'Agent',
        PrenomUser: 'Secrétariat',
        Telephone: '+228123456789',
        roleName: 'secretariat_scanneur'
      },
      {
        Email: 'directeur.general@dgi.gov',
        Password: 'DirecteurDGI2024!',
        NomUser: 'Directeur',
        PrenomUser: 'Général',
        Telephone: '+228123456790',
        roleName: 'dgi_directeur'
      },
      {
        Email: 'directeur.recouvrement@dgi.gov',
        Password: 'DirecteurRecouv2024!',
        NomUser: 'Directeur',
        PrenomUser: 'Recouvrement',
        Telephone: '+228123456791',
        roleName: 'directeur_recouvrement'
      },
      {
        Email: 'sous.directeur@dgi.gov',
        Password: 'SousDirecteur2024!',
        NomUser: 'Sous',
        PrenomUser: 'Directeur',
        Telephone: '+228123456792',
        roleName: 'sous_directeur'
      },
      {
        Email: 'cadre.recouvrement@dgi.gov',
        Password: 'CadreRecouv2024!',
        NomUser: 'Cadre',
        PrenomUser: 'Recouvrement',
        Telephone: '+228123456793',
        roleName: 'cadre_recouvrement'
      }
    ];

    for (const userData of testUsers) {
      try {
        const [user, userCreated] = await User.findOrCreate({
          where: { Email: userData.Email },
          defaults: {
            idUser: uuidv4(),
            Email: userData.Email,
            Password: userData.Password,
            NomUser: userData.NomUser,
            PrenomUser: userData.PrenomUser,
            Telephone: userData.Telephone,
            IsActive: true
          },
          transaction
        });

        if (userCreated || !await UserRoles.findOne({ 
          where: { 
            userId: user.idUser, 
            roleId: createdRoles[userData.roleName].idRole 
          },
          transaction 
        })) {
          await UserRoles.create({
            id: uuidv4(),
            userId: user.idUser,
            roleId: createdRoles[userData.roleName].idRole
          }, { transaction });
          console.log(`✅ Utilisateur ${userData.Email} (${userData.roleName}): ${userCreated ? 'créé' : 'rôle associé'}`);
        } else {
          console.log(`ℹ️  Utilisateur ${userData.Email}: existe déjà avec le bon rôle`);
        }
      } catch (userError) {
        console.log(`⚠️  Erreur pour l'utilisateur ${userData.Email}: ${userError.message}`);
      }
    }

    await transaction.commit();
    console.log('🎉 Workflow DGI initialisé avec succès !');
    
    // Affichage du résumé
    console.log('\n📊 RÉSUMÉ DE L\'INITIALISATION:');
    console.log('================================');
    console.log(`✅ ${roles.length} rôles DGI créés/vérifiés`);
    console.log(`✅ 1 type de projet "Recouvrement DGI" créé/vérifié`);
    console.log(`✅ ${etapes.length} étapes de workflow créées/vérifiées`);
    console.log(`✅ ${testUsers.length} utilisateurs de test créés/vérifiés`);
    console.log('\n🔄 WORKFLOW CONFIGURÉ:');
    etapes.forEach((etape, index) => {
      console.log(`   ${index + 1}. ${etape.LibelleEtape}`);
    });
    console.log('\n🎯 Le workflow DGI est prêt à être utilisé !');

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur lors de l\'initialisation du workflow DGI:', error);
    throw error;
  }
}

// Fonction utilitaire pour afficher les informations du workflow
async function displayWorkflowInfo() {
  try {
    console.log('\n📋 INFORMATIONS DU WORKFLOW DGI:');
    console.log('==================================');
    
    const typeProjet = await TypeProjet.findOne({
      where: { Libelle: 'Recouvrement DGI' },
      include: [{
        model: Etape,
        as: 'Etapes',
        include: [{
          model: Role,
          as: 'role'
        }],
        order: [['sequenceNumber', 'ASC']]
      }]
    });

    if (typeProjet) {
      console.log(`📂 Type de projet: ${typeProjet.Libelle}`);
      console.log(`📝 Description: ${typeProjet.Description}`);
      console.log('\n🔄 Étapes du workflow:');
      
      if (typeProjet.Etapes) {
        typeProjet.Etapes.forEach(etape => {
          console.log(`   ${etape.sequenceNumber}. ${etape.LibelleEtape}`);
          console.log(`      👤 Rôle: ${etape.role?.name || 'Non défini'}`);
          console.log(`      ✅ Validation: ${etape.Validation ? 'Oui' : 'Non'}`);
          console.log('');
        });
      }
    } else {
      console.log('❌ Workflow DGI non trouvé. Exécutez d\'abord l\'initialisation.');
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'affichage des informations:', error);
  }
}

// Exécution du script
if (require.main === module) {
  initDgiWorkflow()
    .then(() => {
      return displayWorkflowInfo();
    })
    .then(() => {
      console.log('\n✨ Script terminé avec succès !');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = {
  initDgiWorkflow,
  displayWorkflowInfo
};
