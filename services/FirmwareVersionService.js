const Logger = require("../utils/logger")
const meshLogger = new Logger("mesh.log");
async function generateFirmwareVersion() {
    try {
        const versionNumbers = [];
        for (let i = 0; i < 4; i++) {
            versionNumbers.push(Math.floor(Math.random() * 10));
        }
        const versionString = versionNumbers.join(".");
        const timestamp = new Date().toISOString();

        return `${versionString} ${timestamp} UTC`;

    } catch (error) {
        meshLogger.log(error)
    }

}
module.exports = generateFirmwareVersion