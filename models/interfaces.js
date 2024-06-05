const { Sequelize, DataTypes, UniqueConstraintError } = require("sequelize");
const sequelize = require("../config/databaseConfig");
const Node = require("./nodes");
const usefulFunctions = require("../utils/usefulFunctions");

const interfaces = sequelize.define(
    "interfaces", {
        //meshtool schema
        interface_id: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true,
            unique: true,
        },
        interface_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        interface_type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        node_id: {
            type: DataTypes.STRING,
            allowNull: false,

            references: {
                model: Node,
                key: "node_id",
            },
        },

        interface_ip: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        interface_mask: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        interface_subnet: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        //speed of the network interface in bits per second (bps)
        interface_speed: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        //related to the macAddress(interfaceID: requires a generator of BSSID)
        wireless_bssid: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        wireless_mode: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        wireless_cell: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        wireless_channel: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        //whether the interface is acting as a client, an access point, or some other role
        wireless_functional_mode: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        //boolean values
        interface_validity: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 1,
        },
        //gets incremented everytime the DB is updated
        topology_version: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },

        //new propriete :

        wireless_channel_bandwidth: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        radio_frequency_band: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },

        //necessité d'ajouter un modele d'antenne pour configurer chaque interface wireless
    }, {
        timestamps: false,
    }
);

// hasMany and belongsTo should get the same name in order to avoid empty column creation

Node.hasMany(interfaces, {
    foreignKey: "node_id",
    sourceKey: "node_id",
}); //

interfaces.belongsTo(Node, {
    foreignKey: "node_id",
    targetKey: "node_id",
}); //

usefulFunctions.syncTable(interfaces, false);

module.exports = interfaces;