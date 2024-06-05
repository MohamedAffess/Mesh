const Logger = require("../utils/logger")
const databaseLogger = new Logger("databaseLogs.log")

async function syncTable(model, syncMode) {
    try {
        await model.sync({ force: syncMode })
        console.log(`${model.name} table synced successfully!`)
        databaseLogger.log(`${model.name} table synced successfully!`)

    } catch (error) {
        console.error(`Error syncing ${model.name} table:`, error)
        databaseLogger.log(`Error syncing ${model.name} table:`);
    }
}



function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}
function generateCenterdValues(center, interval, stdDev) {
  const [min, max] = interval;
  const range = max - min;
  let value;

  do {
    value = Math.round(center + stdDev * range * (2 * Math.random() - 1));
  } while (value < min || value > max);

  return value;
}


module.exports = { syncTable, getRandomInt, generateCenterdValues };