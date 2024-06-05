const Nodes = require("../models/nodes");
const cron = require("node-cron");
const Logger = require("../utils/logger");
const meshLogger = new Logger("mesh.log");

async function generateAndStoreSysLoad1m() {
    try {
        const nodes = await Nodes.findAll({ where: { node_status: 1 } });
        for (const node of nodes) {
            const sysLoad = ((Math.random() * 100) / 100).toFixed(2);
            await Nodes.update({ node_sysLoad1m: sysLoad }, { where: { node_id: node.node_id } });
            // meshLogger.log(`Node ${node.node_id} systemLoad (1min) is ${sysLoad}`);
        }

        Nodes.addHook("afterUpdate", async(node, options) => {
            if (node.changed("node_status")) {
                if (node.node_status === 1) {
                    const sysLoad = ((Math.random() * 100) / 100).toFixed(2);
                    await Nodes.update({ node_sysLoad1m: sysLoad }, { where: { node_id: node.node_id } });
                } else {
                    const sysLoad = 0;
                    await Nodes.update({ node_sysLoad1m: sysLoad }, { where: { node_id: node.node_id } });
                }
            }
        });
    } catch (error) {
        meshLogger.log(error);
    }
}

async function generateAndStoreSysLoad5m() {
    try {
        const nodes = await Nodes.findAll({ where: { node_status: 1 } });
        for (const node of nodes) {
            const sysLoad = ((Math.random() * 100) / 100).toFixed(2);
            await Nodes.update({ node_sysLoad5m: sysLoad }, { where: { node_id: node.node_id } });
            // meshLogger.log(`Node ${node.node_id} systemLoad (5min) is ${sysLoad}`);
        }

        Nodes.addHook("afterUpdate", async(node, options) => {
            if (node.changed("node_status")) {
                if (node.node_status === 1) {
                    const sysLoad = ((Math.random() * 100) / 100).toFixed(2);
                    await Nodes.update({ node_sysLoad5m: sysLoad }, { where: { node_id: node.node_id } });
                } else {
                    const sysLoad = 0;
                    await Nodes.update({ node_sysLoad5m: sysLoad }, { where: { node_id: node.node_id } });
                }
            }
        });
    } catch (error) {
        meshLogger.log(error);
    }
}
async function generateAndStoreSysLoad15m() {
    try {
        const nodes = await Nodes.findAll({ where: { node_status: 1 } });
        for (const node of nodes) {
            const sysLoad = ((Math.random() * 100) / 100).toFixed(2);
            await Nodes.update({ node_sysLoad15m: sysLoad }, { where: { node_id: node.node_id } });
            // meshLogger.log(
            //     `Node ${node.node_id} systemLoad (15min) is ${sysLoad}`
            // );

        }

        Nodes.addHook("afterUpdate", async(node, options) => {
            if (node.changed("node_status")) {
                if (node.node_status === 1) {
                    const sysLoad = ((Math.random() * 100) / 100).toFixed(2);
                    await Nodes.update({ node_sysLoad15m: sysLoad }, { where: { node_id: node.node_id } });
                    meshLogger.log
                } else {
                    const sysLoad = 0;
                    await Nodes.update({ node_sysLoad15m: sysLoad }, { where: { node_id: node.node_id } });
                }
            }
        });

    } catch (error) {
        meshLogger.log(error)

    }

}

cron.schedule("* * * * *", generateAndStoreSysLoad1m); //replace with setInterval()
cron.schedule("*/5 * * * *", generateAndStoreSysLoad5m);
cron.schedule("*/15 * * * *", generateAndStoreSysLoad15m);

module.exports = {
    generateAndStoreSysLoad1m,
    generateAndStoreSysLoad5m,
    generateAndStoreSysLoad15m,
};