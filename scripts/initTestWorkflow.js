const { User, Role, UserRoles, TypeProjet, Etape, EtapeTypeProjet, Permission, RolePermissions, sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

/**
 * Script d'initialisation du workflow de test
 * 
 * USE CASE: Workflow de test avec 3 rôles
 * 
 * ACTEURS PRINCIPAUX:
 * - Agent de saisie (crée et indexe les documents)
 * - Validateur (vérifie et valide les documents)
 * - Superviseur (supervise et approuve final)
 * 
 * WORKFLOW EN 3 ÉTAPES:
 * 1. Saisie - L'agent crée/scanne le document
 * 2. Validation - Le validateur vérifie et annote
 * 3. Approbation - Le superviseur donne l'approbation finale
 */

async function initTestWorkflow(structureName = 'DGI') {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🚀 Début de l\'initialisation du workflow de test...');

    // 1. Création des rôles
    console.log('📋 Création des rôles...');
    const roles = [
      {
        name: 'secretariat_scanneur',
        description: 'Agent du secrétariat - Scanneur ou Agent de recherche',
        isSystemRole: false,
        permissions: ['Créer', 'Rechercher', 'Uploader', 'Indexer', 'Transférer']
      },
      {
        name: 'dgi_directeur',
        description: 'Directeur Général des Impôts (DGI)',
        isSystemRole: false,
        permissions: ['Lire', 'Rechercher', 'Valider', 'Annoter', 'Transférer', 'Signer']
      },
      {
        name: 'directeur_recouvrement',
        description: 'Directeur du Recouvrement (DIR)',
        isSystemRole: false,
        permissions: ['Lire', 'Rechercher', 'Valider', 'Annoter', 'Transférer', 'Quoter']
      }
    ];

    // Création des permissions
    console.log('🔑 Création des permissions...');
    const allPermissions = new Set();
    roles.forEach(role => role.permissions.forEach(perm => allPermissions.add(perm)));
    
    const createdPermissions = {};
    for (const permName of allPermissions) {
      try {
        const [permission, permCreated] = await Permission.findOrCreate({
          where: { LibellePerm: permName },
          defaults: {
            idPermission: uuidv4(),
            LibellePerm: permName,
            Description: `Permission pour ${permName}`
          },
          transaction
        });
        
        if (!permission) {
          throw new Error(`Failed to create/find permission: ${permName}`);
        }
        
        createdPermissions[permName] = permission;
        console.log(`✅ Permission ${permName}: ${permCreated ? 'créée' : 'existe déjà'}`);
      } catch (error) {
        console.error(`❌ Erreur lors de la création de la permission ${permName}:`, error);
        throw error;
      }
    }

    // Création des rôles et attribution des permissions
    const createdRoles = {};
    for (const roleData of roles) {
      const [role, created] = await Role.findOrCreate({
        where: { name: roleData.name },
        defaults: {
          idRole: uuidv4(),
          name: roleData.name,
          description: roleData.description,
          isSystemRole: roleData.isSystemRole
        },
        transaction
      });
      createdRoles[roleData.name] = role;
      console.log(`✅ Rôle ${roleData.name}: ${created ? 'créé' : 'existe déjà'}`);

      // Attribution des permissions
      console.log(`🔄 Attribution des permissions au rôle ${roleData.name}...`);
      for (const permName of roleData.permissions) {
        try {
          const permission = createdPermissions[permName];
          if (!permission) {
            throw new Error(`Permission not found: ${permName}`);
          }

          const [rolePermission, created] = await RolePermissions.findOrCreate({
            where: {
              roleId: role.idRole,
              permissionId: permission.idPermission
            },
            defaults: {
              id: uuidv4(),
              roleId: role.idRole,
              permissionId: permission.idPermission
            },
            transaction
          });

          console.log(`  ✅ Permission "${permName}": ${created ? 'attribuée' : 'déjà attribuée'}`);
        } catch (error) {
          console.error(`❌ Erreur lors de l'attribution de la permission ${permName}:`, error);
          throw error;
        }
      }
    }

    // 2. Création du TypeProjet "Workflow Test"
    console.log('📂 Création du type de projet...');
    let structure = await require('../models').Structure.findOne({ where: { NomStructure: structureName }, transaction });
    if (!structure) {
      console.log(`ℹ️  Structure ${structureName} non trouvée, création...`);
      structure = await require('../models').Structure.create({
        idStructure: uuidv4(),
        NomStructure: structureName,
        DescriptionStructure: `Structure créée automatiquement pour le workflow (${structureName})`
      }, { transaction });
      console.log(`✅ Structure ${structureName} créée.`);
    }

    const [typeProjet, typeCreated] = await TypeProjet.findOrCreate({
      where: { Libelle: 'Recouvrement DGI' },
      defaults: {
        idType: uuidv4(),
        Libelle: 'Recouvrement DGI',
        Description: 'Workflow de traitement des documents de recouvrement fiscal',
        structureId: structure.idStructure
      },
      transaction
    });
    console.log(`✅ TypeProjet "Workflow Test": ${typeCreated ? 'créé' : 'existe déjà'}`);

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
      console.log(`✅ Étape "${etapeData.LibelleEtape}": ${etapeCreated ? 'créée' : 'existe déjà'}`);
    }

    // Association des étapes au TypeProjet
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

        // Ensure user role association exists
        const [userRole, userRoleCreated] = await UserRoles.findOrCreate({
          where: { 
            userId: user.idUser, 
            roleId: createdRoles[userData.roleName].idRole 
          },
          defaults: {
            id: uuidv4(),
            userId: user.idUser,
            roleId: createdRoles[userData.roleName].idRole
          },
          transaction
        });

        // Get all permissions for this role
        const rolePermissions = await RolePermissions.findAll({
          where: { roleId: createdRoles[userData.roleName].idRole },
          transaction
        });

        // Log user creation/update status
        if (userCreated) {
          console.log(`✅ Utilisateur ${userData.Email} créé avec ${rolePermissions.length} permissions`);
        } else if (userRoleCreated) {
          console.log(`✅ Rôle ${userData.roleName} associé à ${userData.Email} avec ${rolePermissions.length} permissions`);
        } else {
          console.log(`ℹ️  Utilisateur ${userData.Email}: existe déjà avec le rôle ${userData.roleName} et ${rolePermissions.length} permissions`);
        }

        // Log the permissions assigned
        const permissionNames = roles.find(r => r.name === userData.roleName)?.permissions || [];
        console.log(`   🔑 Permissions pour ${userData.Email}:${permissionNames.map(p => '\n      - ' + p).join('')}`);
      } catch (userError) {
        console.log(`⚠️  Erreur pour l'utilisateur ${userData.Email}: ${userError.message}`);
      }
    }

    await transaction.commit();
    console.log('✅ Initialisation du workflow de test terminée avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    await transaction.rollback();
    throw error;
  }
}

if (require.main === module) {
  initTestWorkflow()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = initTestWorkflow;
