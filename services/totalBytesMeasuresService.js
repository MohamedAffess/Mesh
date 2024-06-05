const Nodes = require("../models/nodes");
const InterfaceLinks = require("../models/interfaceLinks");
const Interfaces = require("../models/interfaces");
const TotalBytesMeasures = require("../models/totalBytesMeasures");
const cron = require("node-cron");
const { or } = require("sequelize");
const usefulFunctions = require("../utils/usefulFunctions");
const { Op } = require("sequelize");
const Logger = require("../utils/logger");
const meshLogger = new Logger("mesh.log");
//SECTION
//TODO - check if interface has link ( interface_from or interface_to ) + the other interface's node is active  in order to generate value
//SECTION -

// Function to generate totalByteMeasure records
// This async function generates total byte measures for nodes that have interfaces with links
async function generateTotalBytesMeasures() {
  try {
    const nodes = await Nodes.findAll({ where: { node_status: 1 } });
    let previousNodeId;
    let delay = 0;

    for (const { node_id } of nodes) {
      if (node_id !== previousNodeId) {
        var epochDate = Math.floor(Date.now() / 1000);
        previousNodeId = node_id;
        delay += 1000;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));

      const interfaces = await Interfaces.findAll({
        where: { node_id },
      });

      let shouldCreateTotalBytesMeasures = false;
      for (const { interface_id } of interfaces) {
        const nodeHasLinks = await InterfaceLinks.findOne({
          where: or(
            { interface_from: interface_id },
            { interface_to: interface_id }
          ),
        });

        if (nodeHasLinks) {
          shouldCreateTotalBytesMeasures = true;
          break;
        }
      }

      if (shouldCreateTotalBytesMeasures) {
        for (const { interface_id } of interfaces) {
          const existingLink = await InterfaceLinks.findOne({
            where: or(
              { interface_from: interface_id },
              { interface_to: interface_id }
            ),
          });

          const valueIn = existingLink
            ? usefulFunctions.getRandomInt(100000000, 999999999)
            : 0;
          const valueOut = existingLink
            ? usefulFunctions.getRandomInt(100000000, 999999999)
            : 0;

          await TotalBytesMeasures.bulkCreate([
            {
              type: usefulFunctions.getRandomInt(1, 2),
              scale: usefulFunctions.getRandomInt(1, 3),
              value: valueIn,
              date: epochDate,
              interface_id,
              node_id,
            },
            {
              type: usefulFunctions.getRandomInt(1, 2),
              scale: usefulFunctions.getRandomInt(1, 3),
              value: valueOut,
              date: epochDate,
              interface_id,
              node_id,
            },
          ]);

          //Delete old records ( to prevent storage saturation)
          const cutoffDate = new Date(Date.now() - 3 * 60 * 1000); // 3 minutes ago
          await TotalBytesMeasures.destroy({
            where: {
              interface_id,
              node_id,
              date: {
                [Op.lt]: Math.floor(cutoffDate.getTime() / 1000),
              },
            },
          });
        }
      }
    }
  } catch (error) {
    meshLogger.log(error);
  }
}

//watch database for changes
Nodes.addHook("afterUpdate", async (node, options) => {
  if (node.changed("node_status")) {
    if (node.node_status === 1) {
      generateTotalBytesMeasures();
    } else {
      generateTotalBytesMeasures();
    }
  }
});

InterfaceLinks.addHook("afterCreate", async () => {
  generateTotalBytesMeasures();
});
InterfaceLinks.addHook("afterUpdate", async () => {
  generateTotalBytesMeasures();
});

// Schedule the function to run every minute using a cron job
setInterval(generateTotalBytesMeasures, 5000);
module.exports = generateTotalBytesMeasures;
