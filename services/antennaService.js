const axios = require("axios");
const Logger = require("../utils/logger");
const meshLogger = new Logger("mesh.log");
const { StatusCodes } = require("http-status-codes");


async function getAntennaData(model_id){
     try {
          const antennaDataResponse = await axios.get(
               `http://localhost:3300/wms/survey/surveyAntennas/${model_id}`
          );

          if(antennaDataResponse || antennaDataResponse.data){
                              meshLogger.log(antennaDataResponse.data);

               return antennaDataResponse.data;
          }
          
     } catch (error) {
          meshLogger.log(error)
         
          
     }
}

module.exports = { getAntennaData };