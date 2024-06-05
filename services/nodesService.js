const axios = require("axios");
const Logger = require("../utils/logger");
const meshLogger = new Logger("mesh.log");
const { StatusCodes } = require("http-status-codes");

async function getNodeData(node_type) {
    try {
        const nodeDataResponse = await axios.get(
            `http://localhost:3300/wms/survey/luceorProductsNodes/${node_type}`
        );

        if (nodeDataResponse || nodeDataResponse.data) {

            return nodeDataResponse.data;
        }
    } catch (error) {
        meshLogger.log(error);
        return res.json({
            status: StatusCodes.NOT_FOUND,
            message: `couldn't retreive ${node_type} data`,
        });

    }
}



module.exports = { getNodeData };