const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/databaseConfig");
const usefulFunctions = require("../utils/usefulFunctions");

const node = sequelize.define(
  "nodes",
  {
    node_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      primaryKey: true,
    },
    node_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    node_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    node_sn: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    node_hw_model: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    //HERITED FROM INTERFACE
    node_ip_admin: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    routing_mode: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    //boolean
    node_status: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },

    //boolean
    node_validity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    node_license: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "NONE",
    },
    node_fw_version: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    //UNE ADRESSE IPv4 DU COLLECTOR ( QU'ON VA GENERER)
    collector_ip_to_node: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    //____________RELATED TO BATTERY ENTITY________________
    //BOOLEAN
    node_has_battery: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    node_battery_autonomy: {
      type: "DOUBLE",
      allowNull: true,
    },

    node_battery_consumption: {
      type: "DOUBLE",
      allowNull: true,
    },

    node_battery_alert: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    //________________DATA RELATED TO GPS__________________
    node_gps_state: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    node_gps_latitude: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    node_gps_longitude: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    node_gps_altitude: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    node_gps_latitude_err: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    node_gps_longitude_err: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    node_gps_altitude_err: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    //_________RELATED TO ALARMS_________

    node_associated_alarms_groups_ids: {
      type: DataTypes.BLOB,
      allowNull: true,
    },

    node_alarm_level: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true,
    },

    node_sysUpTime_s: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true,
    },
    node_sysCPUUsage: {
      type: DataTypes.REAL,
      defaultValue: 0,
      allowNull: true,
    },
    node_sysLoad1m: {
      type: DataTypes.REAL,
      defaultValue: 0,
      allowNull: true,
    },
    node_sysLoad5m: {
      type: DataTypes.REAL,
      defaultValue: 0,
      allowNull: true,
    },
    node_sysLoad15m: {
      type: DataTypes.REAL,
      defaultValue: 0,
      allowNull: true,
    },
    ssh_fingerprint: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },

    //boolean
    node_monitoring_status: {
      type: DataTypes.INTEGER,
      defaultValue: 0,

      allowNull: true,
    },
    //Boolean
    node_vumeter_status: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true,
    },
    //BOOLEAN
    node_configuration_check_status: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true,
    },
    //BOOLEAN
    node_has_potential_configuration_drifts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true,
    },
    //BOOLEAN
    node_has_configuration_drifts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true,
    },

    node_reference_configuration_date: {
      type: DataTypes.STRING,
      allowNull: true,
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
usefulFunctions.syncTable(node, false);
module.exports = node;
