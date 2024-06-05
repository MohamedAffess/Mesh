const fs = require("fs");
const express = require("express");
const path = require("path");
const Sequelize = require("sequelize");
const Node = require("../models/nodes");
const Interfaces = require("../models/interfaces");
const Logger = require("../utils/logger");
const meshLogger = new Logger("mesh.log");
const interfacesService = require("../services/interfacesService");
const { StatusCodes } = require("http-status-codes");
async function getInterfaces(req, res) {
    try {
        const interfaces = await Interfaces.findAll({
            attributes: [
                "interface_id",
                "node_id",
                "interface_name",
                "interface_type",
                "interface_validity",
                "topology_version",
            ],
        });
        if (interfaces) {
            res.json(interfaces);
        } else {
            res.status(404).json({ error: "InterfacesS not found" });
        }
    } catch (error) {
        meshLogger.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
}

//fix this !!!!!
async function getInterfaceInfo(req, res) {
    try {
        const interface = await Interfaces.findByPk(req.params.id);
        if (interface) {
            res.json(interface);
        } else {
            res.status(404).json({ error: "Interface not found" });
        }
    } catch (error) {
        meshLogger.log(error);
        res.status(500).json({ message: "Error retrieving interface" });
    }
}

//fix this !!!
async function configureInterface(req, res) {
    try {
        const {
            interface_ip,
            interface_mask,
            interface_subnet,
            wireless_channel,
            radio_frequency_band,
        } = req.body;
        if (wireless_channel) {
            const channelData = await interfacesService.getChannelData(
                wireless_channel
            );
            var frequency = channelData.frequency;
        }

        var interface = await Interfaces.findByPk(req.params.id);
        

        if (interface.interface_type === "Wired") {
            interface.interface_ip = interface_ip;
            interface.interface_mask = interface_mask;
            interface.interface_subnet = interface_subnet;
            await interface.save();
            meshLogger.log(
                `${interface.interface_type} interface of id ${interface.interface_id} configured succesfully`
            );
            return res.json({
                status: StatusCodes.OK,
                message: `${interface.interface_type} interface of id ${interface.interface_id} configured succesfully`,

            });
        } else if (interface.interface_type === "Wireless") {
            interface.interface_ip = interface_ip;
            interface.interface_mask = interface_mask;
            interface.interface_subnet = interface_subnet;
            interface.wireless_channel = wireless_channel;
            interface.radio_frequency_band = radio_frequency_band;
            interface.wireless_channel_bandwidth = frequency;
            meshLogger.log(
                `${interface.interface_type} interface of id ${interface.interface_id} configured succesfully`
            );
            await interface.save();
            return res.status(200).json({
                status: StatusCodes.OK,
                message: `${interface.interface_type} interface of id ${interface.interface_id} configured succesfully`,
            });
        }
    } catch (error) {
        meshLogger.log(error);

        return res.status(500).json({
            status: StatusCodes.INTERNAL_SERVER_ERROR,
            message: `internal server error`,
        });
    }
}

// async function configureInterface(req, res) {
//     try {
//         //bch twali macAddress only
//         const interface_id = req.params.interface_id;
//         const configData = req.body;
//         const interface = await Interfaces.findOne({
//             where: {
//                 interface_id: interface_id,
//             },
//         });
//         const node = await Node.findOne({
//             where: { node_id: interface.node_id },
//         });

//         if (!interface) {
//             return res.status(404).json({ message: "Interface not found" });
//         }
//         const interface_type = interface.interface_type;

//         if (interface_type === "Wired") {
//             /*
//                                 if wired , the user should choose the ip addressing type between DHCP  and static config
//                                 then if static configuration is chosen , the user should enter an ip address and a subnetmask
//                                 the wired interface speed is retreived from a json file based on the node that the interface belongs to
//                                 */

//             const ipAddressingType = configData.ipAddressingType; //check the selected option
//             if (ipAddressingType === "DHCP") {
//                 // Appeler la fonction du service DHCP pour attribuer une adresse IP et un masque

//                 const { interface_ip, interface_mask, interface_subnet } =
//                 await DHCPService.assignIP(); //TODO
//                 interface.interface_ip = interface_ip;
//                 interface.interface_mask = interface_mask;
//                 interface.interface_subnet = interface_subnet;
//                 // interface.IP_AddressingType = ipAddressingType

//                 await interface.save();
//             } else if (ipAddressingType === "Static Config") {
//                 const { interface_ip, interface_mask, interface_subnet } = configData;
//                 interface.interface_ip = interface_ip;
//                 interface.interface_mask = interface_mask;
//                 interface.interface_subnet = interface_subnet;
//                 // interface.IP_AddressingType = ipAddressingType
//                 await interface.save();
//             }

//             const node_type = node.node_type;

//             const interfaceSpeed = require(`../luceorProducts/${node_type}.json`)
//                 .wired.outputPort.speed;
//             interface.interface_speed = interfaceSpeed;

//             await interface.save();
//             return res.status(200).json({
//                 message: `Interface ${interface.interface_name} is configured successfully `,
//             });
//         } else if (interface_type === "Wireless") {
//             /*
//       if wireless , we also have to ip addressing type options as in the wired mode .
//       the user also chose a wireless mode (mesh, wifi, point-to-point)
//       the user chose a channel number between the available channels for the node he selected to configure
//       the user also enters an SSID
//      */

//             const ipAddressingType = configData.ipAddressingType;
//             if (ipAddressingType !== "DHCP" && ipAddressingType !== "Static Config") {
//                 return res.status(400).json({ message: "Invalid IP addressing type" });
//             }

//             console.log("here i am _______________________");

//             const wireless_mode = configData.wireless_mode;

//             if (
//                 wireless_mode !== "Wifi" &&
//                 wireless_mode !== "Mesh" &&
//                 wireless_mode !== "Point To Point"
//             ) {
//                 return res.status(400).json({ message: "Invalid wireless mode." });
//             }

//             const wireless_cell = configData.wireless_cell;
//             if (ipAddressingType === "DHCP") {
//                 // Appeler la fonction du service DHCP pour attribuer une adresse IP et un masque
//                 const { interface_ip, interface_mask, interface_subnet } =
//                 await DHCPService.assignIP(); //TODO
//                 interface.interface_ip = interface_ip;
//                 interface.interface_mask = interface_mask;
//                 interface.interface_subnet = interface_subnet;
//                 // interface.IP_AddressingType = ipAddressingType

//                 await interface.save();
//             } else if (ipAddressingType === "Static Config") {
//                 const { interface_ip, interface_mask, interface_subnet } = configData;
//                 interface.interface_ip = interface_ip;
//                 interface.interface_mask = interface_mask;
//                 interface.interface_subnet = interface_subnet;
//                 // interface.IP_AddressingType = ipAddressingType

//                 await interface.save();
//             }

//             // selecting channel , retreiving data  from JSON file

//             const node = await Node.findOne({
//                 where: { node_id: interface.node_id },
//             });
//             const node_type = node.node_type;
//             const wireless_channel = configData.wireless_channel;

//             const wirelessJsonConfig = require(`../luceorProducts/${node_type}.json`);

//             const availableChannels = wirelessJsonConfig.wireless.availableChannels;
//             if (!availableChannels.includes(wireless_channel)) {
//                 return res
//                     .status(400)
//                     .send("Selected channel is not available for this device model");
//             }
//             const channels = wirelessJsonConfig.wireless.channels;
//             const selectedChannel = channels.find(
//                 (channel) => channel.wireless_channel === wireless_channel
//             );

//             interface.wireless_channel = wireless_channel;
//             interface.wireless_channel_bandwidth = selectedChannel.channel_bandwidth;
//             interface.radio_frequency_band = selectedChannel.frequency_band;
//             interface.wireless_cell = wireless_cell;
//             interface.wireless_mode = wireless_mode;
//             interface.interface_speed =
//                 wirelessJsonConfig.wireless.physicalLayer.rate.maxValue;

//             await interface.save();
//             return res.status(200).json({
//                 message: `Interface ${interface.interface_name} is configured successfully `,
//             });
//         } else {}
//     } catch (error) {
//         meshLogger.log(error);
//         res.status(500).json({
//             message: `Interface ${interface.interface_name} is configured successfully `,
//         });
//     }
// }

module.exports = { getInterfaces, getInterfaceInfo, configureInterface };