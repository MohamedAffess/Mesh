const InterfaceLinks = require("../models/interfaceLinks");
const Interfaces = require("../models/interfaces");
const Nodes = require("../models/nodes");
const usefulFunctions = require("../utils/usefulFunctions");
const Logger = require("../utils/logger");
const meshLogger = new Logger("mesh.log");
const { StatusCodes } = require("http-status-codes");
const interfaceAntennas = require("../models/interfaceAntennas");
const interfaceLinks = require("../models/interfaceLinks");
const olsrLinks = require("../models/olsrLinks")
const { Op } = require('sequelize');

const sequelize = require("../config/databaseConfig");


//TODO - write the other node's as interface from and interface _to as interface_from and reverse the original link

async function addLink(req, res) {
  try {
    const { interface_from, interface_to, link_type } = req.body;

    const nodeFrom = await Nodes.findByPk(req.params.id);
    const node_id_from = nodeFrom.node_id;
    const interfaceFrom = await Interfaces.findByPk(interface_from);
    const interfaceTo = await Interfaces.findByPk(interface_to);
    const nodeTo = await Nodes.findByPk(interfaceTo.node_id);
    const node_id_to = nodeTo.node_id;
    const link_id1 = `${interface_to}${interface_from}`;
    const link_id2 = `${interface_from}${interface_to}`;
    const existingLinkId1 = await InterfaceLinks.findByPk(link_id1);
    const existingLinkId2 = await InterfaceLinks.findByPk(link_id2);

   const existingWiredInterfaceFrom = await InterfaceLinks.findOne({
     where: {
       [Op.or]: [
         { interface_from: interface_from, link_physic_type: "Wired" },
         { interface_to: interface_from, link_physic_type: "Wired" },
       ],
     },
   });

   const existingWiredInterfaceTo = await InterfaceLinks.findOne({
     where: {
       [Op.or]: [
         { interface_from: interface_to, link_physic_type: "Wired" },
         { interface_to: interface_to, link_physic_type: "Wired" },
       ],
     },
   });

    if (!(nodeFrom && interfaceFrom && interfaceTo && nodeTo)) {
      res.status(404).json({ message: "Interface of Node not Found" });
    } else if (interfaceTo.node_id === node_id_from) {
      res
        .status(401)
        .json({ message: "cannot link interfaces from the same node" });
    } else if (interfaceTo.interface_type !== interfaceFrom.interface_type) {
      res
        .status(401)
        .json({ message: "cannot link interfaces with different types" });
    } else if (existingLinkId1 || existingLinkId2) {
      res.status(400).json({ message: "link already exists!" });
    } else if (existingWiredInterfaceFrom || existingWiredInterfaceTo) {
      res.status(400).json({ message: "one of the interfaces is already used" });
    } else if (interfaceFrom.node_id !== node_id_from) {
      res
        .status(401)
        .json({ message: "Interface does not belong to the same Node" });
    } else {
      const link_physic_type = interfaceFrom.interface_type;

      // Create entries in both interfaceLinks and olsrLinks tables
      const interfaceLink1 = {
        node_id_from: node_id_from,
        node_id_to: interfaceTo.node_id,
        interface_from: interface_from,
        interface_to: interface_to,
        link_id: link_id1,
        link_type: link_type,
        link_physic_type: link_physic_type,
      };

      const interfaceLink2 = {
        node_id_from: node_id_to,
        node_id_to: node_id_from,
        interface_from: interface_to,
        interface_to: interface_from,
        link_id: link_id2,
        link_type: link_type,
        link_physic_type: link_physic_type,
      };

      await InterfaceLinks.bulkCreate([interfaceLink1, interfaceLink2]);

      // Check if the link type is 3 (Wireless links subtype: olsrLinks)
      if (link_type === 3) {
        // Create entry in olsrLinks table
        const olsrLink1 = {
          node_id_from: node_id_from,
          node_id_to: interfaceTo.node_id,

          interface_from: interface_from,
          interface_to: interface_to,
          link_id: link_id1,
          link_type: link_type,
          link_physic_type: link_physic_type,
        };

        const olsrLink2 = {
          node_id_from: node_id_to,
          node_id_to: node_id_from,

          interface_from: interface_to,
          interface_to: interface_from,
          link_id: link_id2,
          link_type: link_type,
          link_physic_type: link_physic_type,
        };

        await olsrLinks.bulkCreate([olsrLink1, olsrLink2]);
      }

      meshLogger.log(
        `new ${link_physic_type} link ${link_id1} and ${link_id2} added successfully`
      );

      return res.status(200).json({
        status: StatusCodes.OK,
        message: `Link created successfully`,
      });
    }
  } catch (error) {
    meshLogger.log(error);
    res.status(500).json({
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
    });
  }
}



async function getLinks(req, res) {
  try {
    const interfaceLinks = await InterfaceLinks.findAll({
      attributes: [
        "link_id",
        "node_id_from",
        "interface_from",
        "interface_to",
        "link_type",
        "link_validity",
        "topology_version",
      ],
    });
    if (interfaceLinks) {
      res.json(interfaceLinks);
    } else {
      res.status(404).json({ message: "Interface Links not found" });
    }
  } catch (error) {
    meshLogger.log(error);

    res.status(500).json({ message: "Internal server error" });
  }
}

async function getLinksInfo(req, res) {
  try {
    const link = await InterfaceLinks.findByPk(req.params.id);
    if (link) {
      res.json(link);
    } else {
      res.status(404).json({ message: "link does not exist" });
    }
  } catch (error) {
    meshLogger.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function deleteLink(req, res) {
  const { id } = req.params;

  try {
    // Start a transaction
    await sequelize.transaction(async (t) => {
      // Check if the link exists in the olsrLinks table
      const olsrLink = await olsrLinks.findOne({
        where: {
          link_id: id,
        },
        transaction: t, // Include the transaction in the query
      });

      // If the link exists in the olsrLinks table, delete it from there
      if (olsrLink) {
        await olsrLinks.destroy({
          where: {
            link_id: id,
          },
          transaction: t, // Include the transaction in the delete operation
        });
      }

      // Now, delete the link from the interfaceLinks table
      const deletedLink = await interfaceLinks.destroy({
        where: {
          link_id: id,
        },
        transaction: t, // Include the transaction in the delete operation
      });

      if (!deletedLink) {
        res.status(404).json({
          status: StatusCodes.NOT_FOUND,
          message: "Link not found",
        });
      } else {
        res.status(200).json({
          status: StatusCodes.OK,
          message: "Link deleted successfully",
        });
      }
    });
  } catch (error) {
    meshLogger.log(error);
    res.status(500).json({
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
    });
  }
}
//delete also if it exists in olsr links 
module.exports = { addLink, getLinks, getLinksInfo,deleteLink };
