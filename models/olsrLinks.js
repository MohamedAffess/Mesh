const sequelize = require("../config/databaseConfig")
const Node = require("../models/nodes")
const Interfaces = require ("../models/interfaces")
const {DataTypes}=require("sequelize")
const usefulFunctions = require("../utils/usefulFunctions")


const olsrLinks = sequelize.define(
  "olsrLinks",
  {
    link_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      unique: true,
    },
    node_id_from: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: Node,
        key: "node_id",
      },
    },
    node_id_to: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: Node,
        key: "node_id",
      },
    },
    interface_from: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: Interfaces,
        key: "interface_id",
      },
    },
    interface_to: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: Interfaces,
        key: "interface_id",
      },
    },
    link_bandwidth: { type: DataTypes.STRING, allowNull: true },
    link_snr_value: { type: DataTypes.INTEGER, allowNull: true },
    link_type: { type: DataTypes.INTEGER, allowNull: false },
    link_state: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    link_warning_flag: { type: DataTypes.INTEGER, allowNull: true },
    link_validity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    topology_version: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  },

  {
    timestamps: false,
  }
);
Node.hasMany(olsrLinks, {
  foreignKey: "node_id_from",
  sourceKey: "node_id",
});
Node.hasMany(olsrLinks, {
  foreignKey: "node_id_to",
  sourceKey: "node_id",
});
Interfaces.hasMany(olsrLinks, {
  foreignKey: "interface_from",
  sourceKey: "interface_id",
});
Interfaces.hasMany(olsrLinks, {
  foreignKey: "interface_to",
  sourceKey: "interface_id",
});

usefulFunctions.syncTable(olsrLinks,false);

module.exports = olsrLinks;