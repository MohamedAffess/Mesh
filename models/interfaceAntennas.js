const sequelize = require("../config/databaseConfig");
const { Sequelize, DataTypes, UniqueConstraintError } = require("sequelize");
const Node = require("./nodes");
const usefulFunctions = require("../utils/usefulFunctions");
const Interface = require("../models/interfaces");

const interfaceAntennas = sequelize.define(
  "interfaceAntennas",
  {
    antenna_id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      unique: true,
    },
    antenna_model_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    interface_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: Interface,
        key: "interface_id",
      },
    },
    node_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: Node,
        key: "node_id",
      },
    },
    antenna_gain: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    antenna_vertical_angle_aperture: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    antenna_horizontal_angle_aperture: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    radio_bw: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    timestamps: false,
  }
);

Interface.hasMany(interfaceAntennas, {
    foreignKey: "interface_id",
    sourceKey: "interface_id",
});

interfaceAntennas.belongsTo(Interface, {
    foreignKey: "interface_id",
    sourceKey: "interface_id",
});

Node.hasMany(interfaceAntennas, {
    foreignKey: "node_id",
    sourceKey: "node_id",
});
interfaceAntennas.belongsTo(Node, {
    foreignKey: "node_id",
    sourceKey: "node_id",
});
usefulFunctions.syncTable(interfaceAntennas, false);

module.exports = interfaceAntennas;