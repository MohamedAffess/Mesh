const sequelize = require("../config/databaseConfig");
const Node = require("../models/nodes");
const Interfaces = require("../models/interfaces");
const { DataTypes } = require("sequelize");
// const { options } = require('../routes/nodesRouter')
const usefulFunctions = require("../utils/usefulFunctions");

const interfaceLinks = sequelize.define(
  "interfaceLinks",
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
    link_type: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    link_state: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    link_physic_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
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
    // hooks:{
    //     beforeCreate:(link,options)=>{
    //         link.link_id=`${link.interface_to}${link.interface_from}`
    //     }
    // }
  }
);
Node.hasMany(interfaceLinks, {
  foreignKey: "node_id_from",
  sourceKey: "node_id",
});
Node.hasMany(interfaceLinks, {
  foreignKey: "node_id_to",
  sourceKey: "node_id",
});
Interfaces.hasMany(interfaceLinks, {
  foreignKey: "interface_from",
  sourceKey: "interface_id",
});
Interfaces.hasMany(interfaceLinks, {
  foreignKey: "interface_to",
  sourceKey: "interface_id",
});

usefulFunctions.syncTable(interfaceLinks, false);

module.exports = interfaceLinks;
