const axios = require("axios");
const Logger = require("../utils/logger");
const meshLogger = new Logger("mesh.log");
const { StatusCodes } = require("http-status-codes");

async function getChannelData(channel_id) {
    try {
        const channelDataResponse = await axios.get(
            `http://localhost:3300/wms/survey/surveyChannels/${channel_id}`
        );

        if (channelDataResponse || channelDataResponse.data) {
            return channelDataResponse.data;
        }


    } catch (error) {
        //NOTE -  messages should be in this form 
        meshLogger.log(error);
        return res.status(404).json({
            status: StatusCodes.NOT_FOUND,
            message: `couldn't retreive channel ${channel_id} data`,
        });

    }
}

module.exports = { getChannelData };