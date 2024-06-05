const Nodes = require('../models/nodes')
const cron = require('node-cron')
const Logger = require("../utils/logger");
const meshLogger = new Logger("mesh.log")
async function generateAndStoreCPUUsage() {
    try {
        const nodes = await Nodes.findAll({ where: { node_status: 1 } });
        for (const node of nodes) {
            const cpuUsage = ((Math.random() * 100) / 100).toFixed(2);
            if (cpuUsage != 0) {
                await Nodes.update({ node_sysCPUUsage: cpuUsage }, { where: { node_id: node.node_id } });
                // meshLogger.log(`Node ${node.node_id} CPU usage is ${cpuUsage}`);
            }
        }
        Nodes.addHook("afterUpdate", async(node, options) => {
            if (node.changed("node_status")) {
                if (node.node_status === 1) {
                    const cpuUsage = ((Math.random() * 100) / 100).toFixed(2);
                    await Nodes.update({ node_sysCPUUsage: cpuUsage }, { where: { node_id: node.node_id } });
                } else {
                    const cpuUsage = 0;
                    await Nodes.update({ node_sysCPUUsage: cpuUsage }, { where: { node_id: node.node_id } });
                }
            }
        });

    } catch (error) {
        meshLogger.log(error)

    }

}

cron.schedule('*/5 * * * *', generateAndStoreCPUUsage) //replace with setInterval()

module.exports = generateAndStoreCPUUsage