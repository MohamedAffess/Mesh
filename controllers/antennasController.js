const InterfaceAntennas = require("../models/interfaceAntennas");
const Interfaces = require("../models/interfaces");
const Node = require("../models/nodes");
const { StatusCodes } = require("http-status-codes");
const Logger = require("../utils/logger");
const meshLogger = new Logger("mesh.log");
const nodesService = require("../services/nodesService");
const antennaService = require("../services/antennaService");
const { Op } = require("sequelize");

async function getAntennas(req, res) {
  try {
    const interface_id = req.params.id;

    const antennas = await InterfaceAntennas.findAll({
      where: {
        antenna_id: {
          [Op.like]: `${interface_id}_%`,
        },
      },
    });

    const numAntennas = antennas.length;

    const antennaInfo = antennas.map((antenna) => ({
      antenna_id: antenna.antenna_id,
      radio_bw: antenna.radio_bw,
      antenna_gain:antenna.antenna_gain,
      antenna_vertical_angle_aperture:antenna.antenna_vertical_angle_aperture,
      antenna_horizontal_angle_aperture:antenna.antenna_horizontal_angle_aperture


      // Add other properties if needed
    }));

    const response = {
      numAntennas: numAntennas,
      antennas: antennaInfo,
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "An error occurred while fetching antenna information",
    });
  }
}
async function configureAntenna(req, res) {
  try {
    const interface_id  = req.params.id;
    const { radio_bw } = req.body;

    const antennas = await InterfaceAntennas.findAll({
      where: {
        antenna_id: {
          [Op.like]: `${interface_id}_%`,
        },
      },
    });

    if (antennas.length > 0) {
      await Promise.all(
        antennas.map(async (antenna) => {
          antenna.radio_bw = radio_bw;
          await antenna.save();
        })
      );

      return res.status(200).json({
        status: StatusCodes.OK,
        message: `Antennas in interface ${interface_id} updated successfully`,
      });
    } else {
      return res.status(404).json({
        status: StatusCodes.NOT_FOUND,
        message: "Antennas not found for the specified interface ID",
      });
    }
  } catch (error) {
    meshLogger.log(error);
  }
}
async function addAntenna(req, res) {
  try {
    const node = await Node.findByPk(req.params.id);
    const { model_id } = req.body;
    meshLogger.log(model_id);
    const nodeData = await nodesService.getNodeData(node.node_type);
    const antennaData = await antennaService.getAntennaData(model_id);

    const wirelessInterfacesCount = nodeData.wireless_interfaces_count;
    const wlanInterfaceAntennaCount = Math.min(
      nodeData.WLAN_interface_antenna_count,
      4
    );
    const modelId = antennaData.model_id;
    const gain = antennaData.gain;
    const verticalAngleAperture = antennaData.vertical_angle_aperture;
    const horizontalAngleAperture = antennaData.horizontal_angle_aperture;

    if (wlanInterfaceAntennaCount === 0) {
      return res.json({ message: "Node doesn't support antennas" });
    }

    const wirelessInterfaces = await Interfaces.findAll({
      where: {
        node_id: node.node_id,
        interface_type: "Wireless",
      },
    });

    // Check if any antenna exists for the node's wireless interfaces
    const existingAntennas = await InterfaceAntennas.findAll({
      where: {
        interface_id: {
          [Op.in]: wirelessInterfaces.map(
            (interface) => interface.interface_id
          ),
        },
      },
    });

    if (existingAntennas.length > 0) {
      return res.json({ message: "This node already has antennas" });
    }

    for (const wirelessInterface of wirelessInterfaces) {
      for (let i = 0; i < wlanInterfaceAntennaCount; i++) {
        const antenna_id = `${wirelessInterface.interface_id}_${modelId}_${i}`;

        await InterfaceAntennas.create({
          antenna_id,
          interface_id: wirelessInterface.interface_id,
          node_id: node.node_id,
          antenna_gain: gain,
          antenna_vertical_angle_aperture: verticalAngleAperture,
          antenna_horizontal_angle_aperture: horizontalAngleAperture,
        });

        meshLogger.log(`${antenna_id} antenna created`);
      }
    }

    // Respond with a success message
    res.json({ message: "Antennas added successfully" });
  } catch (error) {
    meshLogger.log(error);
    // Respond with an error message
    res.status(500).json({ error: "Internal server error" });
  }
}


module.exports = { addAntenna, configureAntenna, getAntennas };
