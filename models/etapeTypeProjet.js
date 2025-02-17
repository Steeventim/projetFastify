module.exports = (sequelize, DataTypes) => {
  const EtapeTypeProjet = sequelize.define('EtapeTypeProjet', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    etapeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Etapes',
        key: 'idEtape'
      }
    },
    idType: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'TypeProjets',
        key: 'idType'
      }
    }
  }, {
    timestamps: true,
    tableName: 'EtapeTypeProjets'
  });

  return EtapeTypeProjet;
};