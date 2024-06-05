//les modules necessaires
const express = require("express");
const bodyParser = require("body-parser");
const { Sequelize, DataTypes } = require("sequelize");
const fs = require("fs");
const sequelize = require("./config/databaseConfig");
const nodes = require("./models/nodes");
const interfaces = require("./models/interfaces");
const interfaceLinks = require("./models/interfaceLinks");
const totalBytesMeasures = require("./models/totalBytesMeasures");
const snrMeasures = require("./models/snrMeasures");
const interfaceAntennas = require("./models/interfaceAntennas");
const olsrLinks= require("./models/olsrLinks")
const licenes=require("./models/licenses")
const meshRouter = require("./routes/meshRouter");
const generateAndStoreCPUUsage = require("./services/CPUUsageService");
const updateNodeSysUpTime = require("./services/nodeSysUptimeService");
const sysLoad = require("./services/sysLoadService");
const generateTotalBytesMeasures = require("./services/totalBytesMeasuresService");
const generateSnrMeasures=require("./services/snrMeasuresService")
const Logger = require("./utils/logger")
const serverLogger = new Logger("serverLogs.log")

const mqtt = require("mqtt");

// Connect to the MQTT broker
const brokerUrl = 'mqtt://localhost';
const client = mqtt.connect(brokerUrl);




const WebSocket = require("ws");
const wss = new WebSocket.Server({ noServer: true });

// Handle WebSocket connections
wss.on("connection", (ws) => {
  // Handle incoming messages from the front application
  ws.on("message", (message) => {
    // Process the received message and generate a simulated response
    const simulatedResponse = simulateData(); // Implement your own data simulation logic

    // Send the simulated response back to the front application
    ws.send(simulatedResponse);
  });

  // Handle WebSocket close event
  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });
});


    //declare consts
const app = express();
const port = 3200;

app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use("/wms/mesh", meshRouter);
app.use("/wms/admin",meshRouter);
app.use("/wms/config",meshRouter);
app.use("/wms/simData",meshRouter);

//_________________________________
//TODO -
//_____move these to the data generation microservice_____

generateAndStoreCPUUsage();
updateNodeSysUpTime();
sysLoad.generateAndStoreSysLoad15m();
sysLoad.generateAndStoreSysLoad1m();
sysLoad.generateAndStoreSysLoad5m();

generateTotalBytesMeasures();
generateSnrMeasures()

//_________________________________

// Connect to database
sequelize
    .authenticate()
    .then(() => {
        console.log("Database connected and synced succesfully !!! ");
        serverLogger.log("Database connected succesfully");
    })
    .catch((err) => {
        console.error("Database sync failed...", err);
        serverLogger.log("Database sync failed...");
    });

const server = app.listen(port, () => {
  console.log(`Nodes Microservice is listening on ${port}`);
  serverLogger.log(`Nodes Microservice is listening on ${port}`);
});

// Upgrade HTTP requests to WebSocket
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});