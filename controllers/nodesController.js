const fs = require("fs");
const path = require("path");
const Nodes = require("../models/nodes");
const Interfaces = require("../models/interfaces");
const generateUniqueMacAddress = require("../services/MACAddressService");
const generateUniqueSerialNumber = require("../services/serialNumberService");
const generateIpv4Addresses = require("../services/IPv4AddressesService");
const generateFirmwareVersion = require("../services/FirmwareVersionService");
const generateUniqueNodeName = require("../services/nodeNamesGenerator")
const sequelize = require("../config/databaseConfig");
const InterfaceLinks = require("../models/interfaceLinks");
const TotalBytesMeasures = require("../models/totalBytesMeasures");
const SnrMeasures = require("../models/snrMeasures");
const nodesService = require("../services/nodesService");
const { and } = require("sequelize");
const InterfaceAntennas = require("../models/interfaceAntennas");
const Logger = require("../utils/logger");
const meshLogger = new Logger("mesh.log");
const { StatusCodes } = require("http-status-codes");
const { STATUS_CODES } = require("http");
const interfaceLinks = require("../models/interfaceLinks");

const olsrLinks = require("../models/olsrLinks");
const MQTTController = require("../controllers/MQTTController")
const mqtt = require("mqtt");
const { stringify } = require("querystring");
const { error } = require("console");

// Connect to the MQTT broker
const brokerUrl = "mqtt://localhost";
const client = mqtt.connect(brokerUrl);
// MQTT client connect event
client.on("connect", () => {
  console.log("Connected to MQTT broker");
});



async function createNodes(req, res) {
  try {
    const { number_of_nodes, node_type, routing_mode } = req.body;

    // Validate input
    if (number_of_nodes <= 0) {
      return res.status(400).json({ error: "Invalid number of nodes" });
    }
    if (!node_type) {
      return res.status(400).json({ error: "Node type is required" });
    }

    // Retrieve product data for the specified node type
    const productData = await nodesService.getNodeData(node_type);
    if (!productData) {
      return res.status(400).json({ error: "Invalid node type" });
    }

    // Retrieve parameters from product data
    const {
      node_hw_model,
      wired_interfaces_count,
      wireless_interfaces_count,
      node_has_battery,
      wireless_interfaces_speed,
      wired_interfaces_speed,
      WLAN_integrated_antenna_count,
      WLAN_integrated_antenna_gain,
      WLAN_integrated_antenna_vertical_angle_aperture,
      WLAN_integrated_antenna_horizontal_angle_aperture,
    } = productData;

    // Begin transaction
    const t = await sequelize.transaction();
    try {
      const createdNodes = [];

      const batchSize = 100; // Number of nodes to create in each batch
      const totalBatches = Math.ceil(number_of_nodes / batchSize);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startNodeIndex = batchIndex * batchSize;
        const endNodeIndex = Math.min(
          (batchIndex + 1) * batchSize,
          number_of_nodes
        );

        const batchNodes = [];

        for (let i = startNodeIndex; i < endNodeIndex; i++) {
          // Generate node details
          let node_name = `Node ${i + 1}`;
          // Check if the node name already exists
          const existingNode = await Nodes.findOne({
            where: { node_name },
          });

          if (existingNode) {
            // If the node name already exists, generate a new unique name
            let newNodeName = await generateUniqueNodeName(node_name);
            meshLogger.log(
              `Node name "${node_name}" already exists. Changing it to "${newNodeName}".`
            );
            node_name = newNodeName;
          }
          const node_id = await generateUniqueMacAddress();
          const node_sn = await generateUniqueSerialNumber();
          const node_ip = await generateIpv4Addresses();
          const node_fw_version = await generateFirmwareVersion();
          const node_ip_admin = node_ip.ipAddress;

          // Create the node
          meshLogger.log("*****************");
          meshLogger.log("New Node Created ");
          const newNode = await Nodes.create(
            {
              node_id,
              node_name,
              node_type,
              node_hw_model,
              node_sn,
              node_ip_admin,
              routing_mode,
              node_fw_version,
              node_has_battery,
            },
            { transaction: t }
          );


         

          // Create the main wired interface (eth0)
          const nodeMainInterface = await Interfaces.create(
            {
              interface_name: "eth0",
              interface_type: "Wired",
              node_id: newNode.node_id,
              interface_id: newNode.node_id,
              interface_ip: node_ip.ipAddress,
              interface_mask: node_ip.subnetMask,
              interface_subnet: node_ip.networkAddress,
              interface_speed: wired_interfaces_speed,
            },
            { transaction: t }
          );

          // Create additional wired interfaces
          meshLogger.log("Creating New Node Interfaces");

          for (let j = 1; j <= wired_interfaces_count; j++) {
            const interface_name = `eth${j}`;
            const interface_type = "Wired";
            const interface_id = await generateUniqueMacAddress();
            const interfaceIPv4 = await generateIpv4Addresses();
            const interface_ip = interfaceIPv4.ipAddress;
            const interface_mask = interfaceIPv4.subnetMask;
            const interface_subnet = interfaceIPv4.networkAddress;

            await Interfaces.create(
              {
                interface_name,
                interface_type,
                node_id: newNode.node_id,
                interface_id,
                interface_ip,
                interface_mask,
                interface_subnet,
                interface_speed: wired_interfaces_speed,
              },
              { transaction: t }
            );
          }

          meshLogger.log("Wired interfaces created!");

          // Create wireless interfaces
          for (let k = 0; k < wireless_interfaces_count; k++) {
            const interface_name = `wlan${k}`;
            const interface_type = "Wireless";
            const interface_id = await generateUniqueMacAddress();
            const interfaceIPv4 = await generateIpv4Addresses();
            const interface_ip = interfaceIPv4.ipAddress;
            const interface_mask = interfaceIPv4.subnetMask;
            const interface_subnet = interfaceIPv4.networkAddress;

            const newWlan = await Interfaces.create(
              {
                interface_name,
                interface_type,
                node_id: newNode.node_id,
                interface_id,
                interface_ip,
                interface_mask,
                interface_subnet,
                interface_speed: wireless_interfaces_speed,
              },
              { transaction: t }
            );

            if (k < WLAN_integrated_antenna_count) {
              const antenna_id = `${newWlan.interface_id}_integratedAntenna`;
              await InterfaceAntennas.create(
                {
                  antenna_id,
                  interface_id: newWlan.interface_id,
                  node_id: newNode.node_id,
                  antenna_gain: WLAN_integrated_antenna_gain,
                  antenna_vertical_angle_aperture:
                    WLAN_integrated_antenna_vertical_angle_aperture,
                  antenna_horizontal_angle_aperture:
                    WLAN_integrated_antenna_horizontal_angle_aperture,
                },
                { transaction: t }
              );
              meshLogger.log(`${antenna_id} antenna created`);
            }
          }

          meshLogger.log("Wireless interfaces created!");
          meshLogger.log("****************************");

          batchNodes.push(newNode);
        }

        createdNodes.push(...batchNodes);

        // Introduce a delay between batches to avoid overwhelming the database
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      await t.commit();
      return res.status(201).json(createdNodes);
    } catch (error) {
      await t.rollback();
      meshLogger.log(error);
      return res.status(500).json({ error: "Failed to create nodes" });
    }
  } catch (error) {
    meshLogger.log(error);
    return res.status(500).json({ error: "Failed to create nodes" });
  }
}





// async function publishNodeData() {
//   try {
//     const nodes = await Nodes.findAll();
//     const topicPrefix = "simulatorData";

   
//     if (nodes) {
//       for (const node of nodes) {
//         const nodeId = node.node_id;

//         // Publish data to the "/nodes/node_id/discover" topic
//         const discoverTopic = `${topicPrefix}/nodes/${nodeId}/discover`;
//         const discoverData = {
//           main_ip: node.node_ip_admin,
//         };
//         client.publish(discoverTopic, JSON.stringify(discoverData), (error) => {
//           if (error) {
//             console.error(`Failed to publish data to ${discoverTopic}:`, error);
//           } else {
//             console.log(`Data published successfully to ${discoverTopic}`);
//           }
//         });

//         // Publish data to the "/nodes/node_id/ping" topic
//         const pingTopic = `${topicPrefix}/nodes/${nodeId}/ping`;
//         const pingData = {
//           Sn: node.node_sn,
//           Fw: node.node_fw_version,
//         };
//         client.publish(pingTopic, JSON.stringify(pingData), (error) => {
//           if (error) {
//             console.error(`Failed to publish data to ${pingTopic}:`, error);
//           } else {
//             console.log(`Data published successfully to ${pingTopic}`);
//           }
//         });
//         // Publish data to the "/nodes/node_id/static" topic
//         const staticTopic = `${topicPrefix}/nodes/${nodeId}/static`;
//         const staticData = {
//           Type: node.node_type,
//           Mode: node.routing_mode,
//           Name: node.node_name,
//           HW: node.node_hw_model,
//           SSHfp: node.ssh_fingerprint,
//         };
//         client.publish(staticTopic, JSON.stringify(staticData), (error) => {
//           if (error) {
//             console.error(`Failed to publish data to ${staticTopic}:`, error);
//           } else {
//             console.log(`Data published successfully to ${staticTopic}`);
//           }
//         });

//         // Fetch interfaces for the current node
//         const interfaces = await Interfaces.findAll({
//           where: { node_id: nodeId, interface_type: "Wireless" },
//         });

//         if (interfaces) {
//           const interfacesData = {};

//           // Iterate over the interfaces
//           for (const iface of interfaces) {
//             const interfaceData = {
//               bssid: iface.wireless_bssid,
//               cell: null,
//               channel: iface.wireless_channel,
//               functionalMode: iface.wireless_functional_mode,
//               id: iface.interface_id,
//               ip: iface.interface_ip,
//               mask: iface.interface_mask,
//               mode: iface.wireless_mode,
//               name: iface.interface_name,
//               speed: iface.interface_speed,
//             };

//             // Add interface data to the interfacesData object
//             interfacesData[iface.interface_id] = interfaceData;
//           }

//           // Publish interface data to the "/nodes/node_id/interfaces" topic
//           const interfacesTopic = `/nodes/${nodeId}/interfaces`;
//           const interfacesPayload = {
//             interfaces: interfacesData,
//           };
//           client.publish(
//             interfacesTopic,
//             JSON.stringify(interfacesPayload),
//             (error) => {
//               if (error) {
//                 console.error(
//                   `Failed to publish data to ${interfacesTopic}:`,
//                   error
//                 );
//               } else {
//                 console.log(
//                   `Data published successfully to ${interfacesTopic}`
//                 );
//               }
//             }
//           );
//         }

//       }


//     }

    
//   } catch (error) {
//     console.error("Failed to fetch nodes data for publishing:", error);
//   }
// }

async function getNodes(req, res) {
  try {
    const nodes = await Nodes.findAll({
      attributes: [

        "node_id",
        "node_name",
        "node_type",
        "node_ip_admin",
        "node_validity",
        "node_status",
        "node_sysUpTime_s",
        "node_sysCPUUsage",
        "node_sysLoad1m",
        "node_sysLoad5m",
        "node_sysLoad15m",
        "topology_version",
      ],
    });
    if (nodes) {
            // await MQTTController.publishNodeData();


      res.json(nodes);
    } else {
      res.status(404).json({ message: "Nodes not Found" });
    }
  } catch (error) {
    meshLogger.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function getNodeInfo(req, res) {
  try {
    const node = await Nodes.findByPk(req.params.id);
    if (node) {
      res.json(node);
    } else {
      res.status(404).json({ message: "node does not exist" });
    }
  } catch (error) {
    meshLogger.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function getCurrentFirmwareVersion(req, res) {
  try {
    const node = await Nodes.findByPk(req.params.id);
    if (node) {
      res.json({ node_fw_version: node.node_fw_version });
    } else {
      res
        .status(404)
        .json({ message: "Couldn't find node's firmware version" });
    }
  } catch (error) {
    meshLogger.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
}

//might remove this function
async function changeNodeStatus(req, res) {
  try {
    const node = await Nodes.findByPk(req.params.id);
    if (!node) {
      return res.status(404).send("Node not found");
    }
    const newStatus = req.body.newStatus.toLowerCase();

    if (newStatus !== "start" && newStatus !== "shutdown") {
      return res.status(400).send("Invalid status");
    }
    if (newStatus === "start" && node.node_status === 1) {
      return res.send("Node already started");
    }

    if (newStatus === "shutdown" && node.node_status === 0) {
      return res.send("Node is already stopped");
    }

    const updatedStatus = newStatus === "start" ? 1 : 0;
    node.node_status = updatedStatus;
    if (updatedStatus === 0) {
      await node.update({ node_monitoring_status: 0 });
    }
    await node.save();

    return res.send(
      `Node ${node.node_name} status has been changed successfully `
    );
  } catch (error) {
    meshLogger.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
}
async function startNode(req, res) {
  try {
    const node = await Nodes.findByPk(req.params.id);

    if (!node) {
      res.json({
        status: 404,
        message: "node does not exist",
      });
    }

    if (node.node_status === 1) {
      res.json({
        status: 400,
        message: "node already started",
      });
    } else {
      await node.update({ node_status: 1 });

      
      res.json({
        status: 200,
        message: "node started",
      });
    }
  } catch (error) {
    meshLogger.log(error);

    res.json({
      status: 500,
      message: error,
    });
  }
}

async function startNodes(req, res) {
  try {
    const nodeIds = req.body.node_ids;

    if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
      return res.status(400).json({ error: "Invalid node IDs" });
    }

    const nodes = await Nodes.findAll({
      where: {
        node_id: nodeIds,
      },
    });

    if (nodes.length === 0) {
      return res.status(404).json({ error: "Nodes not found" });
    }

    const startedNodes = [];

    for (const node of nodes) {
      if (node.node_status === 1) {
        // Node already started
        startedNodes.push(node.node_id);
      } else {
        await node.update({ node_status: 1 });
        startedNodes.push(node.node_id);
      }
    }

    return res.status(200).json({ message: "Nodes started", startedNodes });
  } catch (error) {
    meshLogger.log(error);
    return res.status(500).json({ error: "Failed to start nodes" });
  }
}
async function stopNode(req, res) {
  try {
    const node = await Nodes.findByPk(req.params.id);

    if (!node) {
      res.json({
        status: 404,
        message: "node does not exist",
      });
    }

    if (node.node_status === 0) {
      res.json({
        status: 400,
        message: "node already stopped",
      });
    } else {
      await node.update({
         node_status: 0,
         node_monitoring_status:0,
         node_vumeter_status:0
         });
      res.json({
        status: 200,
        message: "node stopped",
      });
    }
  } catch (error) {
    meshLogger.log(error);

    res.json({
      status: 500,
      message: error,
    });
  }
}
async function stopNodes(req, res) {
  try {
    const nodeIds = req.body.node_ids;

    const nodes = await Nodes.findAll({
      where: { node_id: nodeIds },
    });

    if (nodes.length === 0) {
      res.json({
        status: 404,
        message: "Nodes do not exist",
      });
      return;
    }

    const stoppedNodes = [];

    for (const node of nodes) {
      if (node.node_status === 0) {
        stoppedNodes.push(node.node_id);
      } else {
        await node.update({ 
          node_status: 0,
          node_monitoring_status:0,
          node_vumeter_status:0
        
        
        });
        stoppedNodes.push(node.node_id);
      }
    }

    res.json({
      status: 200,
      message: "Nodes stopped",
      stoppedNodes: stoppedNodes,
    });
  } catch (error) {
    meshLogger.log(error);

    res.json({
      status: 500,
      message: error,
    });
  }
}

async function startNodeMonitoring(req, res) {
  try {
    const node = await Nodes.findByPk(req.params.id);

    if (!node) {
      res.json({
        status: StatusCodes.NOT_FOUND,
        message: "node does not exist",
      });
    }

    if (node.node_status === 1) {
      if (node.node_monitoring_status === 0) {
        await node.update({ node_monitoring_status: 1 });
        res.json({
          status: StatusCodes.OK,
          message: "node monitoring started",
        });
      } else {
        res.json({
          status: StatusCodes.ACCEPTED,
          message: "this node is already monitored",
        });
      }
    } else {
      res.json({
        status: StatusCodes.CONFLICT,
        message: "node isn't started",
      });
    }
  } catch (error) {
    meshLogger.log(error);

    res.json({
      status: -3,
      message: error,
    });
  }
}

async function startNodesMonitoring(req, res) {
  try {
    const nodeIds = req.body.node_ids;

    const nodes = await Nodes.findAll({
      where: { node_id: nodeIds },
    });

    if (nodes.length === 0) {
      res.json({
        status: 404,
        message: "Nodes do not exist",
      });
      return;
    }

    const startedMonitoringNodes = [];
    const shouldBeStarted=[];

    for (const node of nodes) {
      if (node.node_status === 1) {
        if (node.node_monitoring_status === 0) {
          await node.update({ node_monitoring_status: 1 });
          startedMonitoringNodes.push(node.node_id);
        }else{
         startedMonitoringNodes.push(node.node_id) 
         //NOTE - Already started monitoring 
        }
      }else{
        shouldBeStarted.push(`Node ${node.node_id} must be started first !\n`)
      }
    }

    res.json({
      status: 200,
      SuccessMessage: "Node monitoring started successfully",
      startedNodes: startedMonitoringNodes,
      FailureMessage:"Monitoring not started for nodes: ",
      notStartedMonitoring: shouldBeStarted
    });
  } catch (error) {
    meshLogger.log(error);

    res.json({
      status: 500,
      message: error,
    });
  }
}

async function stopMonitoring(req, res) {
  try {
    const node = await Nodes.findByPk(req.params.id);

    if (!node) {
      res.json({
        status: StatusCodes.NOT_FOUND,
        message: "node does not exist",
      });
    }

    if (node.node_status === 1) {
      if (node.node_monitoring_status === 1) {
        await node.update({ 
          node_monitoring_status: 0 ,
          node_vumeter_status:0
        });
        res.json({
          status: StatusCodes.OK,
          message: "node monitoring stopped",
        });
      } else {
        res.json({
          status: StatusCodes.ACCEPTED,
          message: "this node is already not monitored",
        });
      }
    } else {
      res.json({
        status: StatusCodes.CONFLICT,
        message: "node isn't started",
      });
    }
  } catch (error) {
    meshLogger.log(error);

    res.json({
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      message: error,
    });
  }
}
async function stopNodesMonitoring(req, res) {
  try {
    const nodeIds = req.body.node_ids;

    const nodes = await Nodes.findAll({
      where: { node_id: nodeIds },
    });

    if (nodes.length === 0) {
      res.json({
        status: 404,
        message: "Nodes do not exist",
      });
      return;
    }

    const stoppedMonitoringForNodes = [];
    const shutDownNodes=[]

    for (const node of nodes) {
      if (node.node_status === 1) {
        if (node.node_monitoring_status === 1) {
          await node.update({ node_monitoring_status: 0, node_vumeter_status:0 });
          stoppedMonitoringForNodes.push(node.node_id);
        }else{
          stoppedMonitoringForNodes.push(node.node_id)
          //NOTE - Already stopped monitoring 
        }
      }else{
        shutDownNodes.push(`Node ${node.node_id} is already turned off\n`);
      }
    }

    res.json({
      status: 200,
      SuccessMessage: "Monitoring stopped successfully for nodes: ",
      stoppedNodes: stoppedMonitoringForNodes,
      FailureMessage: "",
      shutDownNodes: shutDownNodes
    });
  } catch (error) {
    meshLogger.log(error);

    res.json({
      status: 500,
      message: error,
    });
  }
}

async function rebootNode(req, res) {
  try {
    const node = await Nodes.findByPk(req.params.id);
    if (!node) {
      res.json({
        status: -10,
        message: "node does not exist",
      });
    }
    if (node.node_status === 1) {
      await node.update({ node_status: 0 });
      console.log(`Rebooting node with ID ${node.node_id}`);
      setTimeout(async () => {
        await node.update({ node_status: 1 });
        console.log(`Node with ID ${node.node_id} has finished rebooting`);
        res.json({
          status: 0,
          message: "rebooted succesfully",
        });
      }, 4000); // 30 seconds in milliseconds
    } else {
      res.json({
        status: -14,
        message: "node isn't booted already",
      });
    }
  } catch (error) {
    meshLogger.log(error);

    res.json({
      status: -3,
      message: error,
    });
  }
}
async function rebootNodes(req, res) {
  try {
    const nodeIds = req.body.node_ids;

    const nodes = await Nodes.findAll({
      where: { node_id: nodeIds },
    });

    if (nodes.length === 0) {
      res.json({
        status: 404,
        message: "Nodes do not exist",
      });
      return;
    }

    const rebootedNodes = [];
    const notRebootedNodes=[];

    for (const node of nodes) {
      if (node.node_status === 1) {
        await node.update({ node_status: 0 });
        console.log(`Rebooting node with ID ${node.node_id}`);
        setTimeout(async () => {
          await node.update({ node_status: 1 });
          console.log(`Node with ID ${node.node_id} has finished rebooting`);
          rebootedNodes.push(node.node_id);
        }, 4000); // 4 seconds in milliseconds
      }else if(node.node_status===0){
        notRebootedNodes.push(node.node_id);
        //NOTE - Turned off nodes  that must be started in order to reboot 
      }
    }

    res.json({
      status: 200,
      SuccessMessage: "Nodes rebooted successfully: ",
      rebootedNodes: rebootedNodes,
      FailureMessage: "Nodes not rebooted: ",
      downNodes: notRebootedNodes,
    });
  } catch (error) {
    meshLogger.log(error);

    res.json({
      status: 500,
      message: error,
    });
  }
}

async function getCurrentSshpubkeyFingerprint(req, res) {
  try {
    const node = await Nodes.findByPk(req.params.id);
    const ssh_fingerprint = node.ssh_fingerprint;
    if (node) {
      res.json({
        ssh_fingerprint,
      });
    } else {
      res.json({
        status: -14,
        message: "an error has occured",
      });
    }
  } catch (error) {
    meshLogger.log(error);

    res.json({
      status: -3,
      message: `an error with ${error} message has occured`,
    });
  }
}

async function startVumeter(req, res) {
  try {
    const node = await Nodes.findByPk(req.params.id);

    if (!node) {
      res.json({
        status: StatusCodes.NOT_FOUND,
        message: "node does not exist",
      });
    }

    if (node.node_status === 1) {
      if (node.node_monitoring_status === 1) {
        if (node.node_vumeter_status === 0) {
          await node.update({ node_vumeter_status: 1 });
          res.json({
            status: StatusCodes.OK,
            message: "node vumeter started",
          });
        } else {
          res.json({
            status: StatusCodes.ACCEPTED,
            message: "node vumeter has already started",
          });
        }
      } else {
        res.json({
          status: StatusCodes.CONFLICT,
          message: "monitoring must be started",
        });
      }
    } else {
      res.json({
        status: StatusCodes.CONFLICT,
        message: "node isn't started",
      });
    }
  } catch (error) {
    meshLogger.log(error);

    res.json({
      status: -3,
      message: error,
    });
  }
}
async function startNodesVumeter(req, res) {
  try {
    const nodeIds = req.body.node_ids;

    const nodes = await Nodes.findAll({
      where: { node_id: nodeIds },
    });

    if (nodes.length === 0) {
      res.json({
        status: 404,
        message: "Nodes do not exist",
      });
      return;
    }

    const vumeterStartedForNodes = [];
    const vumeterNotStartedForNodes=[]

    for (const node of nodes) {
      if (node.node_status === 1) {
        if (node.node_monitoring_status === 1) {
          if (node.node_vumeter_status === 0) {
            await node.update({ node_vumeter_status: 1 });
            vumeterStartedForNodes.push(node.node_id);
          }else{
            vumeterStartedForNodes.push(node.node_id) //NOTE -  already started vumeter
          }
        }else{
          vumeterNotStartedForNodes.push(`Node ${node.node_id} monitoring must be turned on  \n`);

        }
      }else{
        vumeterNotStartedForNodes.push(`Node ${node.node_id} must be turned on\n`);
        
      }
    }

    res.json({
      status: 200,
      vumeter_started_for_nodes: vumeterStartedForNodes,
      vumeter_not_started_for_nodes: vumeterNotStartedForNodes,
    });
  } catch (error) {
    meshLogger.log(error);

    res.json({
      status: 500,
      message: error,
    });
  }
}

async function vumeterStatus(req, res) {
  try {
    const node = await Nodes.findByPk(req.params.id);
    const vumeterStatus = node.node_vumeter_status;
    if (!node) {
      res.json({
        status: -10,
        message: "node does not exist",
      });
    }
    if (vumeterStatus) {
      res.json({
        vumeter_started: true,
      });
    } else {
      res.json({
        vumeterStatus: false,
      });
    }
  } catch (error) {
    meshLogger.log(error);

    res.json({
      status: -3,
      message: `an error with ${error} message has occured`,
    });
  }
}

async function stopVumeter(req, res) {
  try {
    const node = await Nodes.findByPk(req.params.id);

    if (!node) {
      res.json({
        status: StatusCodes.NOT_FOUND,
        message: "node does not exist",
      });
    }

    if (node.node_status === 1) {
      if (node.node_vumeter_status === 1) {
        await node.update({ node_vumeter_status: 0 });
        res.json({
          status: StatusCodes.OK,
          message: "node vumeter stopped",
        });
      } else {
        res.json({
          status: StatusCodes.ACCEPTED,
          message: "the vumeter already stopped",
        });
      }
    } else {
      res.json({
        status: StatusCodes.CONFLICT,
        message: "node isn't started",
      });
    }
  } catch (error) {
    meshLogger.log(error);

    res.json({
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      message: error,
    });
  }
}

async function stopNodesVumeter(req, res) {
  try {
    const nodeIds = req.body.node_ids;

    const nodes = await Nodes.findAll({
      where: { node_id: nodeIds },
    });

    if (nodes.length === 0) {
      res.json({
        status: 404,
        message: "Nodes do not exist",
      });
      return;
    }

    const vumeterStoppedForNodes = [];
    const shutDownNodes=[];

    for (const node of nodes) {
      if (node.node_status === 1) {
        if (node.node_vumeter_status === 1) {
          await node.update({ node_vumeter_status: 0 });
          vumeterStoppedForNodes.push(node.node_id);
        }else{

          vumeterStoppedForNodes.push(node.node_id); //NOTE -  already stopped vumeter

        }
      }else{
        shutDownNodes.push(`Node ${node.node_id} must be started first\n`)
      }
    }

    res.json({
      status: 200,
      stoppedNodes: vumeterStoppedForNodes,
      shutDownNodes:shutDownNodes
    });
  } catch (error) {
    meshLogger.log(error);

    res.json({
      status: 500,
      message: error,
    });
  }
}


async function getNodeLinks(req, res) {
  try {
    const nodeLinks = await InterfaceLinks.findAll({
      attributes: [
        "link_id",
        "node_id_from",
        "interface_from",
        "interface_to",
        "link_type",
        "link_validity",
        "topology_version",
      ],

      where: { node_id_from: req.params.id },
    });
    if (nodeLinks) {
      res.json(nodeLinks);
    } else {
      res.status(404).json({ message: "Interface Links not found" });
    }
  } catch (error) {
    meshLogger.log(error);

    res.status(500).json({ message: "Internal server error" });
  }
}
async function getSystemStatsForAllNodes(req, res) {
  try {
    const stats = await Nodes.findAll({
      attributes: [
        "node_id",
        "node_sysUpTime_s",
        "node_sysCPUUsage",
        "node_sysLoad1m",
        "node_sysLoad5m",
        "node_sysLoad15m",
      ],
    });
    if (stats) {
      res.status(200).json(stats);
    } else {
      res.status(404).json({ message: "Interface Links not found" });
    }
  } catch (error) {
    meshLogger.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
}
async function getAllTotalBytesMeasures(req, res) {
  try {
    const node = await Nodes.findByPk(req.params.id);
    if (node) {
      const AlltotalBytesMeasures = await TotalBytesMeasures.findAll({
        where: { node_id: req.params.id },
        order: [["date", "DESC"]],
      });
      res.status(200).json(AlltotalBytesMeasures);
    } else {
      res.status(404).json({ message: "Node des not exist" });
    }
  } catch (error) {
    meshLogger.log(error);
    res.status(500).json({ message: error });
  }
}

async function getLastTotalBytesMeasures(req, res) {
  /**
   * * Tout d'abord, elle récupère les paramètres de la requête tels que l'échelle scale et le nombre de mesures number à récupérer.
   * *Ensuite, elle calcule une taille de page pageSize pour limiter le nombre de résultats retournés à 12 fois le nombre de mesures
   * *souhaité.
   */

  const withScale = req.query.scale || 1; // ! measure scale
  const valuesNumber = req.query.number || 1; //! the number of measures
  const pageSize = 12 * valuesNumber; //! page size is the number of measures times 12

  try {
    const node = await Nodes.findByPk(req.params.id);
    if (node) {
      const measures = await TotalBytesMeasures.findAll({
        where: { node_id: req.params.id, scale: withScale },
        order: [["date", "DESC"]],
        limit: pageSize,
      });

      const result = [];
      const interfaceMeasureCounts = {}; // !itf_counts est un objet qui contient un compteur pour chaque interface et chaque type de mesure.

      measures.forEach((measure) => {
        const itfM = `${measure.interface_id}_${measure.type}`; // !itf est une variable qui contient une chaîne de caractères correspondant à l'interface et au type d'une mesure de consommation de données
        if (interfaceMeasureCounts[itfM] === undefined) {
          result.push(measure);
          interfaceMeasureCounts[itfM] = 1;
        } else if (interfaceMeasureCounts[itfM] < valuesNumber) {
          result.push(measure);
          interfaceMeasureCounts[itfM] += 1;
        }
      });

      res.status(200).json(result);
    } else {
      res.status(404).json({ message: "node does not exist" });
    }
  } catch (error) {
    meshLogger.log(error);

    res.status(500).json({ message: error });
  }
}

async function getLastTotalBytesMeasuresForAllInterfaces(req, res) {
  const withScale = req.query.scale || 1;
  const valuesNumber = req.query.number || 1;
  try {
    const interfaces = await Interfaces.findAll({
      where: { interface_validity: 1 },
    });
    const result = [];
    const interfaceIds = interfaces.map((i) => i.interface_id);
    const pageSize = interfaces.length * valuesNumber * 2; // IN and OUT => *2
    const measures = await TotalBytesMeasures.findAll({
      where: { interface_id: interfaceIds, scale: withScale },
      order: [["date", "DESC"]],
      limit: pageSize,
    });
    if (measures) {
      const interfaceMeasureCounts = {};
      measures.forEach((measure) => {
        const itfM = `${measure.interface_id}_${measure.type}`;
        if (interfaceMeasureCounts[itfM] === undefined) {
          result.push(measure);
          interfaceMeasureCounts[itfM] = 1;
        } else {
          if (interfaceMeasureCounts[itfM] < valuesNumber) {
            result.push(measure);
            interfaceMeasureCounts[itfM] += 1;
          }
        }
      });
    }
    res.status(200).json(result);
  } catch (error) {
    meshLogger.log(error);

    res.status(500).json({ message: error });
  }
}

async function getAllSnrMeasures(req, res) {
  try {
    const node = await Nodes.findByPk(req.params.id);
    if (node) {
      const AllSnrMeasures = await SnrMeasures.findAll({
        where: {
          node_id: req.params.id
        },
        order: [["snr_measure_date", "DESC"]],
      });
      res.status(200).json(AllSnrMeasures);
    } else {
      res.status(404).json({ message: "Node des not exist" });
    }
  } catch (error) {
    meshLogger.log(error);
    res.status(500).json({ message: error });
  }
}
async function getLastSnrMeasures(req, res) {
  const withScale = req.query.scale || 0;
  const valuesNumber = req.query.number || 1;
  const pageSize = valuesNumber * 6; // Allow 6 interfaces

  try {
    const node = await Nodes.findByPk(req.params.id);

    if (!node) {
      return res.status(404).json({
        message: "node does not exist",
      });
    }

    const measures = await SnrMeasures.findAll({
      where: { node_id: req.params.id, snr_measure_scale: withScale },
      order: [["snr_measure_date", "DESC"]],
      limit: pageSize,
    });

    const result = [];

    if (measures) {
      const linkCounts = {};

      measures.forEach((measure) => {
        const link = `${measure.local_interface_id}${measure.remote_interface_id}`;

        if (linkCounts[link] === undefined) {
          result.push(measure);
          linkCounts[link] = 1;
        } else {
          if (linkCounts[link] < valuesNumber) {
            result.push(measure);
            linkCounts[link]++;
          }
        }
      });
    }

    res.status(200).json(result);
  } catch (error) {
    meshLogger.log(error);

    res.status(500).json({ message: error });
  }
}
async function getLastSnrMeasuresForAllWirelessLinks(req, res) {
  const withScale = req.query.scale || 0;
  const valuesNumber = req.query.number || 1; // Link number limit

  try {
    const links = await InterfaceLinks.findAll({
      where: { link_physic_type: "Wireless" },
    });
    const result = [];
    const interfaceIds = [];

    for (const link of links) {
      interfaceIds.push(link.interface_from);
      interfaceIds.push(link.interface_to);
    }

    const pageSize = links.length * valuesNumber * 2; // two directions by link

    const measures = await SnrMeasures.findAll({
      where: {
        local_interface_id: interfaceIds,
        snr_measure_scale: withScale,
      },
      order: [["snr_measure_date", "DESC"]],
      limit: pageSize,
    });

    if (measures) {
      const linkCounts = {};

      measures.forEach((measure) => {
        const link = `${measure.local_interface_id}${measure.remote_interface_id}`;

        if (linkCounts[link] === undefined) {
          result.push(measure);
          linkCounts[link] = 1;
        } else {
          if (linkCounts[link] < valuesNumber) {
            result.push(measure);
            linkCounts[link]++;
          }
        }
      });
    }

    res.status(200).json(result);
  } catch (error) {
    meshLogger.log(error);

    res.status(500).json({ message: error });
  }
}

// async function deleteNode(req, res) {
//   const t = await sequelize.transaction();

//   try {
//     const node = await Nodes.findByPk(req.params.id);
//     if (node) {
//       const nodeStatus = node.node_status;
//       if (nodeStatus === 0) {
//         const deletedNode = await Nodes.destroy({
//           where: {
//             node_id: req.params.id,
//           },
//         });
//         const deletedInterfaces = await Interfaces.destroy({
//           where: { node_id: req.params.id },
//         });
//         const deletedLinks = await InterfaceLinks.destroy({
//           where: {
//             node_id_from: req.params.id,
//           },
//         });
//         const deletedAntennas = await InterfaceAntennas.destroy({
//           where: {
//             node_id: req.params.id,
//           },
//         });

//         if (!deletedNode) {
//           res.status(404).json({
//             status: StatusCodes.NOT_FOUND,
//             message: "Node not found",
//           });
//         } else {
//           res.status(200).json({
//             status: StatusCodes.OK,
//             message: "Node deleted successfully",
//           });
//         }
//       } else {
//         res.status(400).json({
//           status: StatusCodes.BAD_REQUEST,
//           message: "Please turn off the node first !",
//         });
//       }
//     }else{
//         res.status(404).json({
//           status: StatusCodes.NOT_FOUND,
//           message: "Node doesn't exist",
//         });

//     }
//   } catch (error) {
//     meshLogger.log(error);
//     res.status(500).json({
//       status: StatusCodes.INTERNAL_SERVER_ERROR,
//       message: "Internal server error",
//     });
//   }
// }
async function deleteNode(req, res) {
  const t = await sequelize.transaction();

  try {
    const node = await Nodes.findByPk(req.params.id);
    if (node) {
      const nodeStatus = node.node_status;
      if (nodeStatus === 0) {
        const deletedRows = await Nodes.destroy({
          where: { node_id: req.params.id },
          include: [
            { model: Interfaces, where: { node_id: req.params.id } },
            { model: InterfaceLinks, where: { node_id_from: req.params.id } },
            { model: InterfaceAntennas, where: { node_id: req.params.id } },
          ],
          transaction: t,
        });

        if (deletedRows === 0) {
          res.status(404).json({
            status: StatusCodes.NOT_FOUND,
            message: "Node not found",
          });
        } else {
          await t.commit();
          res.status(200).json({
            status: StatusCodes.OK,
            message: "Node deleted successfully",
          });
        }
      } else {
        res.status(400).json({
          status: StatusCodes.BAD_REQUEST,
          message: "Please turn off the node first !",
        });
      }
    } else {
      res.status(404).json({
        status: StatusCodes.NOT_FOUND,
        message: "Node doesn't exist",
      });
    }
  } catch (error) {
    meshLogger.log(error);
    await t.rollback();
    res.status(500).json({
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
    });
  }



 
}

async function deleteNodes(req, res) {
  const t = await sequelize.transaction();

  try {
    const nodeIds = req.body.node_ids;

    const nodes = await Nodes.findAll({
      where: { node_id: nodeIds },
    });

    if (nodes.length === 0) {
      res.json({
        status: 404,
        message: "Nodes do not exist",
      });
      return;
    }

    const deletedNodes = [];

    for (const node of nodes) {
      const nodeStatus = node.node_status;
      if (nodeStatus === 0) {
        const deletedRows = await Nodes.destroy({
          where: { node_id: node.node_id },
          include: [
            { model: Interfaces, where: { node_id: node.node_id } },
            { model: InterfaceLinks, where: { node_id_from: node.node_id } },
            { model: InterfaceAntennas, where: { node_id: node.node_id } },
          ],
          transaction: t,
        });

        if (deletedRows > 0) {
          deletedNodes.push(node.node_id);
        }
      }
    }

    await t.commit();

    res.json({
      status: 200,
      message: "Nodes deleted successfully",
      deletedNodes: deletedNodes,
    });
  } catch (error) {
    meshLogger.log(error);
    await t.rollback();
    res.json({
      status: 500,
      message: error,
    });
  }
}

function removeDuplicateLinks(links) {
  const uniqueLinks = [];
  const visitedPairs = new Set();

  for (const link of links) {
    const { interface_from, interface_to } = link;
    const linkPair = `${interface_from}_${interface_to}`;
    const reverseLinkPair = `${interface_to}_${interface_from}`;

    if (!visitedPairs.has(linkPair) && !visitedPairs.has(reverseLinkPair)) {
      uniqueLinks.push(link);
      visitedPairs.add(linkPair);
    }
  }

  return uniqueLinks;
}
 async function getTopology(req, res) {
  try {
    // Retrieve all nodes from the database
    const nodes = await Nodes.findAll();
    const interfaces=await Interfaces.findAll();
    const links= await interfaceLinks.findAll();
    const OlsrLinks= await olsrLinks.findAll()
    

    // Format nodes data into the desired response object
    const nodesList = nodes.map((node) => ({
      node_id: node.node_id,
      node_type:node.node_type,
      node_name:node.node_name,
      node_ip_admin: node.node_ip_admin,
      node_validity: node.node_validity,
      node_status: node.node_status,
      node_sysUpTime_s: node.node_sysUpTime_s,
      node_sysCPUUsage: node.node_sysCPUUsage,
      node_sysLoad1m: node.node_sysLoad1m,
      node_sysLoad5m: node.node_sysLoad5m,
      node_sysLoad15m: node.node_sysLoad15m,
      topology_version: node.topology_version,
    }));
    const interfaces_list= interfaces.map((interface)=>({
      interface_id:interface.interface_id,
      node_id:interface.node_id,
      interface_validity:interface.interface_validity,
      topology_version:interface.topology_version

    }))
     const uniqueLinks = removeDuplicateLinks(links);
     const uniqueOlsrLinks = removeDuplicateLinks(OlsrLinks);

     const links_list = uniqueLinks.map((link) => ({
       link_id: link.link_id,
       node_id_from: link.node_id_from,
       node_id_to: link.node_id_to,
       interface_from: link.interface_from,
       interface_to: link.interface_to,
       link_type: link.link_type,
       link_stat: link.link_state,
       link_physic_type: link.link_physic_type,
       link_validity: link.link_validity,
       topology_version: link.topology_version,
     }));

     const olsr_links_list = uniqueOlsrLinks.map((olsrLink) => ({
       link_id: olsrLink.link_id,
       node_id_from: olsrLink.node_id_from,
       node_id_to: olsrLink.node_id_to,
       interface_from: olsrLink.interface_from,
       interface_to: olsrLink.interface_to,
       link_bandwidth: olsrLink.link_bandwidth,
       link_snr_value: olsrLink.link_snr_value,
       link_type: olsrLink.link_type,
       link_state: olsrLink.link_state,
       link_warning_flag: olsrLink.link_warning_flag,
       link_validity: olsrLink.link_validity,
       topology_version: olsrLink.topology_version,
     }));
    
     


//     {
//     "cellular_list": [],
//     "version": 0,
//     "vpn_list": [],
//     "nodes_list": [],
//     "interfaces_list": [],
//     "links_list": [],
//     "olsr_links_list": []
// }

    const response = {
      version: 1,
      cellular_list:[],
      vpn_list:[],
      nodes_list: nodesList,
      interfaces_list:interfaces_list,
      links_list:links_list,
      olsr_links_list:olsr_links_list
    };

    // Send the response as JSON
    res.status(200).json(response);
  } catch (error) {
    meshLogger.log(error)
    // Handle errors
    res.status(500).send("Internal server error");
  }


 }


module.exports = {
  createNodes,
  getNodes,
  getNodeInfo,
  getCurrentFirmwareVersion,
  changeNodeStatus,
  startNode,
  startNodes,
  stopNode,
  stopNodes,
  startNodeMonitoring,
  startNodesMonitoring,
  stopMonitoring,
  stopNodesMonitoring,
  rebootNode,
  rebootNodes,
  getCurrentSshpubkeyFingerprint,
  startVumeter,
  startNodesVumeter,
  vumeterStatus,
  stopVumeter,
  stopNodesVumeter,
  getNodeLinks,
  getSystemStatsForAllNodes,
  getAllTotalBytesMeasures,
  getLastTotalBytesMeasures,
  getLastTotalBytesMeasuresForAllInterfaces,
  getAllSnrMeasures,
  getLastSnrMeasures,
  getLastSnrMeasuresForAllWirelessLinks,
  deleteNode,
  deleteNodes,
  getTopology
};
