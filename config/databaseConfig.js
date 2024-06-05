const { Sequelize } = require("sequelize");
const fs = require("fs");
const { error } = require("console");
const Logger = require("../utils/logger");
const databaseLogger = new Logger('databaseLogs.log')


try {
    //database creation
    const DATA_BASE_DIRECTORY = "./dbDirectory"; //DB directory
    const DATA_BASE_NAME = "mesh.sqlite"; //DB file name
    const DATA_BASE_PATH = `${DATA_BASE_DIRECTORY}/${DATA_BASE_NAME}`; //database file path

    //check if directory exists else create it
    if (!fs.existsSync(DATA_BASE_DIRECTORY)) {
        fs.mkdirSync(DATA_BASE_DIRECTORY);
        console.log("Database directory created succesfully !");
        databaseLogger.log("Database directory created succesfully !");
    } else {
        console.log("Database directory already exists !");
        databaseLogger.log("Database directory already exists !");
    }

    var sequelize = new Sequelize({
        dialect: "sqlite",
        storage: DATA_BASE_PATH,
        logging: (msg) => {
            if (msg.startsWith("Error: ")) {
                databaseLogger.log(msg);
            }
        },
    });
} catch (error) {
    databaseLogger.log(error)
    console.log(error)

}

module.exports = sequelize;