const sequelize = require("../config/databaseConfig");
const { DataTypes } = require("sequelize");
const usefulFunctions = require("../utils/usefulFunctions");
const Node = require("../models/nodes");
const Interfaces = require("../models/interfaces");
const totalBytesMeasures = require("../models/totalBytesMeasures");

const snrMeasures = sequelize.define(
  "snrMeasures",
  {
    snr_measure_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: true,
      unique: true,
      autoIncrement: true,
    },
    snr_measure_agregated_value: { type: DataTypes.INTEGER, allowNull: true },
    snr_measure_signalA: { type: DataTypes.INTEGER, allowNull: true },
    snr_measure_noiseA: { type: DataTypes.INTEGER, allowNull: true },
    snr_measure_signalB: { type: DataTypes.INTEGER, allowNull: true },
    snr_measure_noiseB: { type: DataTypes.INTEGER, allowNull: true },
    snr_measure_signalC: { type: DataTypes.INTEGER, allowNull: true },
    snr_measure_noiseC: { type: DataTypes.INTEGER, allowNull: true },
    snr_measure_signalD: { type: DataTypes.INTEGER, allowNull: true },
    snr_measure_noiseD: { type: DataTypes.INTEGER, allowNull: true },
    snr_measure_last_rx: { type: DataTypes.INTEGER, allowNull: true },
    snr_measure_connector_number: { type: DataTypes.INTEGER, allowNull: true },
    snr_measure_date: { type: DataTypes.BIGINT, allowNull: true },
    snr_measure_scale: { type: DataTypes.INTEGER, allowNull: true },
    snr_measure_radio_bwA: { type: DataTypes.INTEGER, allowNull: true },
    snr_measure_radio_bwB: { type: DataTypes.INTEGER, allowNull: true },
    snr_measure_radio_bwC: { type: DataTypes.INTEGER, allowNull: true },
    snr_measure_radio_bwD: { type: DataTypes.INTEGER, allowNull: true },
    snr_measure_radio_bwMax: { type: DataTypes.INTEGER, allowNull: !true },
    local_interface_index: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    remote_interface_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: Interfaces,
        key: "interface_id",
      },
    },
    local_interface_id: {
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

Node.hasMany(snrMeasures, {
  foreignKey: "node_id",
  sourceKey: "node_id",
});
Interfaces.hasMany(snrMeasures, {
  foreignKey: "local_interface_id",
});
Interfaces.hasMany(snrMeasures, {
  foreignKey: "remote_interface_id",
  sourceKey: "interface_id",
});

snrMeasures.belongsTo(Node, {
  foreignKey: "node_id",
});
snrMeasures.belongsTo(Interfaces, {
  foreignKey: "local_interface_id",
  sourceKey: "interface_id",
});
snrMeasures.belongsTo(Interfaces, {
  foreignKey: "remote_interface_id",
  sourceKey: "interface_id",
});

usefulFunctions.syncTable(snrMeasures, false);

module.exports = snrMeasures;
