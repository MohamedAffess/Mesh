const Nodes = require('../models/nodes')
const cron = require('node-cron');
const Logger = require('../utils/logger')
const meshLogger = new Logger("mesh.log")

async function updateNodeSysUpTime() {
    try {
        const nodes = await Nodes.findAll({ where: { node_status: 1 } });

        const intervals = {}; //empty object , used to store key values of : {node_id : interval_id}

        for (const node of nodes) {
            const interval = 1000; // 1 second
            intervals[node.node_id] = setInterval(async() => {
                const updatedNode = await Nodes.findByPk(node.node_id);
                if (updatedNode.node_status === 1) {
                    updatedNode.node_sysUpTime_s += interval / 1000; // increment by 1 second
                    await updatedNode.save();
                } else {
                    clearInterval(intervals[node.node_id]); // stop the interval for this node
                    // delete intervals[node.node_id]
                }
            }, interval);
        }

        //whatching the database changements for node status
        Nodes.addHook("afterUpdate", async(node, options) => {
            if (node.changed("node_status")) {
                if (node.node_status === 1) {
                    const interval = 1000; // 1 second
                    intervals[node.node_id] = setInterval(async() => {
                        const updatedNode = await Nodes.findByPk(node.node_id);
                        if (updatedNode.node_status === 1) {
                            updatedNode.node_sysUpTime_s += interval / 1000; // increment by 1 second
                            await updatedNode.save();
                        } else {
                            clearInterval(intervals[node.node_id]); // stop the interval for this node
                        }
                    }, interval);
                } else {
                    clearInterval(intervals[node.node_id]); // stop the interval for this node
                }
            }
        });

    } catch (error) {
        meshLogger.log(error)


    }


}
module.exports = updateNodeSysUpTime