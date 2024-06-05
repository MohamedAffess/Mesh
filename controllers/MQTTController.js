const Nodes = require("../models/nodes");
const Interfaces = require("../models/interfaces");
const InterfaceLinks = require("../models/interfaceLinks");
const OlsrLinks = require("../models/olsrLinks");
const Logger = require("../utils/logger");
const meshLogger = new Logger("mesh.log");

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


async function publishNodeData(req, res) {
  try {
    const nodes = await Nodes.findAll();
    const topicPrefix = "";
    const responses = [];

    if (nodes) {
      for (const node of nodes) {
        const nodeId = node.node_id;

        // Publish data to the "/nodes/node_id/discover" topic
        const discoverTopic = `${topicPrefix}/nodes/${nodeId}/discover`;
        const discoverData = {
          main_ip: node.node_ip_admin,
        };
        client.publish(discoverTopic, JSON.stringify(discoverData), (error) => {
          if (error) {
            meshLogger.log(
              `Failed to publish data to ${discoverTopic}: ${error}`
            );
          } else {
            meshLogger.log(`Data published successfully to ${discoverTopic}`);
          }
        });

        // Publish data to the "/nodes/node_id/ping" topic
        const pingTopic = `${topicPrefix}/nodes/${nodeId}/ping`;
        const pingData = {
          Sn: node.node_sn,
          Fw: node.node_fw_version,
        };
        client.publish(pingTopic, JSON.stringify(pingData), (error) => {
          if (error) {
            meshLogger.log(`Failed to publish data to ${pingTopic}: ${error}`);
          } else {
            meshLogger.log(`Data published successfully to ${pingTopic}`);
          }
        });

        // Publish data to the "/nodes/node_id/static" topic
        const staticTopic = `${topicPrefix}/nodes/${nodeId}/static`;
        const staticData = {
          Type: node.node_type,
          Mode: node.routing_mode,
          Name: node.node_name,
          HW: node.node_hw_model,
          SSHfp: node.ssh_fingerprint,
        };
        client.publish(staticTopic, JSON.stringify(staticData), (error) => {
          if (error) {
            meshLogger.log(
              `Failed to publish data to ${staticTopic}: ${error}`
            );
          } else {
            meshLogger.log(`Data published successfully to ${staticTopic}`);
          }
        });

        // Fetch interfaces for the current node
        const interfaces = await Interfaces.findAll({
          where: { node_id: nodeId, interface_type: "Wireless" },
        });

        if (interfaces) {
          const interfacesData = {};

          // Iterate over the interfaces
          for (const iface of interfaces) {
            const interfaceData = {
              bssid: iface.wireless_bssid,
              cell: null,
              channel: iface.wireless_channel,
              functionalMode: iface.wireless_functional_mode,
              id: iface.interface_id,
              ip: iface.interface_ip,
              mask: iface.interface_mask,
              mode: iface.wireless_mode,
              name: iface.interface_name,
              speed: iface.interface_speed,
            };

            // Add interface data to the interfacesData object
            interfacesData[iface.interface_id] = interfaceData;
          }

          // Publish interface data to the "/nodes/node_id/interfaces" topic
          const interfacesTopic = `${topicPrefix}/nodes/${nodeId}/interfaces`;
          const interfacesPayload = {
            interfaces: interfacesData,
          };
          client.publish(
            interfacesTopic,
            JSON.stringify(interfacesPayload),
            (error) => {
              if (error) {
                meshLogger.log(
                  `Failed to publish data to ${interfacesTopic}: ${error}`
                );
              } else {
                meshLogger.log(
                  `Data published successfully to ${interfacesTopic}`
                );
              }
            }
          );
        }



        // Fetch interface links for the current node
        const interfaceLinks = await InterfaceLinks.findAll({
          where: {
            node_id_from: nodeId,
            link_physic_type: "Wireless",
          },
        });
        

        

        if (interfaceLinks) {
          const linksData = [];

          // Iterate over the interface links
          for (const link of interfaceLinks) {
            const interfaceFromId = link.interface_from;
            const interfaceFrom = await Interfaces.findOne({
              where: { interface_id: interfaceFromId },
            });

            const links = await InterfaceLinks.findAll({
              where: { interface_from: interfaceFromId },
            });

            const remoteEndData = [];

            for (const linkTo of links) {
              const interfaceTo = await Interfaces.findOne({
                where: { interface_id: linkTo.interface_to },
              });

              const remoteEnd = {
                nodeId: interfaceTo.node_id,
                interfaceId: linkTo.interface_to,
                ipAddress: interfaceTo ? interfaceTo.interface_ip : "",
              };

              remoteEndData.push(remoteEnd);
            }

            const linkData = {
              interfaceId: interfaceFromId,
              ipAddress: interfaceFrom ? interfaceFrom.interface_ip : "",
              remoteEnd: remoteEndData,
            };

            linksData.push(linkData);
          }

          // Publish interface links data to the "/nodes/node_id/topology" topic
          const topologyTopic = `${topicPrefix}/nodes/${nodeId}/topology`;
          const topologyPayload = {
            Links: linksData,
          };
          client.publish(
            topologyTopic,
            JSON.stringify(topologyPayload),
            (error) => {
              if (error) {
                meshLogger.log(
                  `Failed to publish data to ${topologyTopic}: ${error}`
                );
              } else {
                meshLogger.log(
                  `Data published successfully to ${topologyTopic}`
                );
              }
            }
          );
        }

        // Fetch OLSR links for the current node
        const olsrLinks = await OlsrLinks.findAll({
          where: {
            node_id_from: nodeId,
          },
        });

        if (olsrLinks) {
          const routesData = [];

          // Iterate over the OLSR links
          for (const link of olsrLinks) {
            const interfaceFromId = link.interface_from;
            const interfaceFrom = await Interfaces.findOne({
              where: { interface_id: interfaceFromId },
            });

            const links = await OlsrLinks.findAll({
              where: { interface_from: interfaceFromId },
            });

            const remoteEndData = [];

            for (const linkTo of links) {
              const interfaceTo = await Interfaces.findOne({
                where: { interface_id: linkTo.interface_to },
              });

              const remoteEnd = {
                nodeId_to: interfaceTo.node_id,
                interfaceId_to: linkTo.interface_to,
                ipAddress_to: interfaceTo ? interfaceTo.interface_ip : "",
              };

              remoteEndData.push(remoteEnd);
            }

            const routeData = {
              interface_from: interfaceFromId,
              ipAddress: interfaceFrom ? interfaceFrom.interface_ip : "",
              "remoteEnd (interfaces_to)": remoteEndData,
            };

            routesData.push(routeData);
          }

          // Publish OLSR routes data to the "/nodes/node_id/olsr" topic
          const olsrTopic = `${topicPrefix}/nodes/${nodeId}/olsr`;
          const olsrPayload = {
            Routes: routesData,
          };
          client.publish(olsrTopic, JSON.stringify(olsrPayload), (error) => {
            if (error) {
              meshLogger.log(
                `Failed to publish data to ${olsrTopic}: ${error}`
              );
            } else {
              meshLogger.log(`Data published successfully to ${olsrTopic}`);
            }
          });
        }
      }
    }

    res.status(200).json({ message: "Data published successfully" });
  } catch (error) {
    meshLogger.log("An error occurred while publishing node data:", error);
    res.status(500).json({ message: "Failed to publish node data" });
  }
}




module.exports = { publishNodeData };
