const sequelize = require("../config/databaseConfig");
const { DataTypes } = require("sequelize");
const usefulFunctions = require("../utils/usefulFunctions");
const Node = require("../models/nodes");
const Interfaces = require("../models/interfaces");

const totalBytesMeasures = sequelize.define(
  "totalBytesMeasures",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: true,
      unique: true,
      autoIncrement: true,
    },
    type: { type: DataTypes.INTEGER, allowNull: true },
    scale: { type: DataTypes.INTEGER, allowNull: true },
    value: { type: DataTypes.BIGINT, allowNull: true },
    date: { type: DataTypes.BIGINT, allowNull: true },
    interface_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: Interfaces,
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
  },
  {
    timestamps: false,
  }
);

Node.hasMany(totalBytesMeasures, {
  foreignKey: "node_id",
  sourceKey: "node_id",
});
Interfaces.hasMany(totalBytesMeasures, {
  foreignKey: "interface_id",
  sourceKey: "interface_id",
});
totalBytesMeasures.belongsTo(Node, {
  foreignKey: "node_id",
  targetKey: "node_id",
});
totalBytesMeasures.belongsTo(Interfaces, {
  foreignKey: "interface_id",
  sourceKey: "interface_id",
});
usefulFunctions.syncTable(totalBytesMeasures, false);

module.exports = totalBytesMeasures;
