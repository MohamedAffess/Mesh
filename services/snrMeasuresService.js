const InterfaceLinks = require("../models/interfaceLinks");
const SnrMeasures = require("../models/snrMeasures");
const Nodes = require("../models/nodes");
const Interfaces = require("../models/interfaces");
const InterfaceAntennas = require("../models/interfaceAntennas");
const { StatusCodes } = require("http-status-codes");
const Logger = require("../utils/logger");
const usefulFunctions = require("../utils/usefulFunctions");
const sequelize = require("../config/databaseConfig");
const meshLogger = new Logger("mesh.log");
const cron = require("node-cron");
const { Op } = require("sequelize");


async function generateSnrMeasures(req, res) {
  try {
    const wirelessLinks = await InterfaceLinks.findAll({
      where: {
        link_physic_type: "Wireless",
      },
    });
    let delay = 0;

    for (const link of wirelessLinks) {
      const nodeFrom = await Nodes.findByPk(link.node_id_from);
      const nodeStatus = nodeFrom.node_status;
      if (nodeStatus === 1) {
        var epochDate = Math.floor(Date.now() / 1000);
        delay += 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        const localInterfaceId = link.interface_from; //
        const remoteInterfaceId = link.interface_to; //

        //FIXME - find the row's number for each local interface
        //    const local_interface_index = await Interfaces.findOne({
        //      where: { interface_id: localInterfaceId },
        //      attributes: [[sequelize.fn("COUNT", sequelize.col("interface_id")), "index"]],
        //      raw: true,
        //    });
        //    meshLogger.log(local_interface_index.index);
        //FIXME -

        

        const interfaceAntennas = await InterfaceAntennas.findAll({
          where: {
            interface_id: localInterfaceId,
          },
        });

        //__________________radio_bw____________________

        let antennaRadioBW = []; //tableau pour stocker les valuers tous les valeurs de  de radio
        for (const antenna of interfaceAntennas) {
          antennaRadioBW.unshift(antenna.radio_bw);
        }
        let snrMeasureRadioBW = [];
        for (i = 0; i < 4; i++) {
          snrMeasureRadioBW.unshift(-1);
        }

        for (let i = 0; i < snrMeasureRadioBW.length; i++) {
          if (i < antennaRadioBW.length) {
            snrMeasureRadioBW[i] = antennaRadioBW[i]; // on copie la valeur du premier tableau dans le deuxième
          } else {
            break; // si on a atteint la fin du premier tableau, on sort de la boucle
          }
        }

        var snr_measure_radio_bwMax = 0;
        for (i = 0; i < snrMeasureRadioBW.length; i++) {
          if (snrMeasureRadioBW[i] != -1) {
            snr_measure_radio_bwMax += snrMeasureRadioBW[i];
          }
        }

        //__________________snr signals____________________
        let gains = [];
        for (const antenna of interfaceAntennas) {
          gains.unshift(antenna.antenna_gain);
        }

        let snrMeasureSignals = [];
        for (i = 0; i < 4; i++) {
          snrMeasureSignals.unshift(-128);
        }

        for (let i = 0; i < snrMeasureSignals.length; i++) {
          if (i < gains.length) {
            snrMeasureSignals[i] =
              10 * Math.log10(Math.pow(10, (gains[i] - 30) / 10)) - 30;
          }
        }

        //__________________snr noises____________________
        const interval = [-130, -70];
        const center = -95;
        const stdDev = 0.09;
        let snrMeasureNoises = [];
        for (i = 0; i < 4; i++) {
          snrMeasureNoises.unshift(-128);
        }

        for (let i = 0; i < snrMeasureNoises.length; i++) {
          if (i < gains.length) {
            snrMeasureNoises[i] = usefulFunctions.generateCenterdValues(
              center,
              interval,
              stdDev
            );
          }
        }

        //__________________ Aggregated SNR_________________________

        var signalsSum = 0;
        for (i = 0; i < snrMeasureSignals.length; i++) {
          signalsSum += Math.pow(10, snrMeasureSignals[i] / 10);
        }
        noisesSum = 0;
        for (i = 0; i < snrMeasureNoises.length; i++) {
          noisesSum += Math.pow(10, snrMeasureNoises[i] / 10);
        }
        const snr_measure_agregated_value = Math.round(
          10 * Math.log10(signalsSum / noisesSum)
        );

        await SnrMeasures.create({
          snr_measure_agregated_value: snr_measure_agregated_value,

          snr_measure_signalA: snrMeasureSignals[0],
          snr_measure_signalB: snrMeasureSignals[1],
          snr_measure_signalC: snrMeasureSignals[2],
          snr_measure_signalD: snrMeasureSignals[3],
          snr_measure_noiseA: snrMeasureNoises[0],
          snr_measure_noiseB: snrMeasureNoises[1],
          snr_measure_noiseC: snrMeasureNoises[2],
          snr_measure_noiseD: snrMeasureNoises[3],
          snr_measure_last_rx: usefulFunctions.getRandomInt(0, 500),
          snr_measure_connector_number: 0,
          snr_measure_date: epochDate,
          snr_measure_scale: usefulFunctions.getRandomInt(1, 4),
          snr_measure_radio_bwA: snrMeasureRadioBW[0],
          snr_measure_radio_bwB: snrMeasureRadioBW[1],
          snr_measure_radio_bwC: snrMeasureRadioBW[2],
          snr_measure_radio_bwD: snrMeasureRadioBW[3],
          snr_measure_radio_bwMax: snr_measure_radio_bwMax,
          local_interface_index: usefulFunctions.getRandomInt(10, 15),
          remote_interface_id: remoteInterfaceId,
          local_interface_id: localInterfaceId,
          node_id: nodeFrom.node_id,
        });




         const cutoffDate = new Date(Date.now() - 3 * 60 * 1000); // 3 minutes ago
         await SnrMeasures.destroy({
           where: {
             node_id: nodeFrom.node_id,
             snr_measure_date: {
               [Op.lt]: Math.floor(cutoffDate.getTime() / 1000),
             },
           },
         });
      }
    }
  } catch (error) {
    meshLogger.log(error);
  }
}

Nodes.addHook("afterUpdate", async (node, options) => {
  if (node.changed("node_status")) {
    if (node.node_status === 1) {
      generateSnrMeasures();
    } else {
      generateSnrMeasures();
    }
  }
});

InterfaceLinks.addHook("afterCreate", async () => {
  generateSnrMeasures();
});
InterfaceLinks.addHook("afterUpdate", async () => {
  generateSnrMeasures();
});

setInterval(generateSnrMeasures, 1000);

module.exports = generateSnrMeasures;
