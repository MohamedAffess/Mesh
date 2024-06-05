  const sequelize = require("../config/databaseConfig")
const usefulFunctions = require("../utils/usefulFunctions")
const {DataTypes}=require("sequelize")

  const licenses = sequelize.define(
    "licenses",
    {
      stored_key: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
        allowNull: false,
      },
      type: { type: DataTypes.STRING, allowNull: false },
      exp_date: { type: DataTypes.STRING, allowNull: true },
      exp_duration_sec: { type: DataTypes.INTEGER, allowNull: true },
      sn_list: { type: DataTypes.BLOB, allowNull: true },
      clients_max: { type: DataTypes.INTEGER, allowNull: true },
      users_max: { type: DataTypes.INTEGER, allowNull: true },
      node_number: { type: DataTypes.INTEGER, allowNull: true },
      version: { type: DataTypes.INTEGER, allowNull: true },
      validity: { type: DataTypes.INTEGER, allowNull: true },
      check_date: { type: DataTypes.STRING, allowNull: true },
      cd: { type: DataTypes.STRING, allowNull: true },
      invalidity_reason: { type: DataTypes.STRING, allowNull: true },
    },
    {
      timestamps: false,
    }
  );
  
  usefulFunctions.syncTable(licenses, false);

module.exports = licenses;