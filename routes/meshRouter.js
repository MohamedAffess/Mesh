const express = require("express");
const meshRouter = express.Router();
const nodesController = require("../controllers/nodesController");
const interfacesController = require("../controllers/interfacesController");
const linksController = require("../controllers/linksController");
const antennasController=require("../controllers/antennasController")
const mockController = require("../controllers/mockController");
const MQTTController=require("../controllers/MQTTController")
// nodesRouter.get('/', (req, res) => {
//     res.send('Hello World!');
//   });

meshRouter

  //______________nodes____________
  //login

  .post("/users/login/",mockController.login)
  //create a node
  .post("/nodes/createNodes", nodesController.createNodes) //bulk create
  .delete("/nodes/deleteNode/:id", nodesController.deleteNode)
  .delete("/nodes/deleteNodes", nodesController.deleteNodes) //bulk delete

  // start / stop node
  .put("/nodes/changeStatus/:id", nodesController.changeNodeStatus)
  .put("/nodes/startNode/:id", nodesController.startNode)
  .put("/nodes/startNodes", nodesController.startNodes) //bulk update
  .put("/nodes/stopNode/:id", nodesController.stopNode)
  .put("/nodes/stopNodes", nodesController.stopNodes) //bulk update

  // get all nodes
  .get("/nodes", nodesController.getNodes)
  // get one node by macAddress
  .get("/nodes/:id", nodesController.getNodeInfo)
  // get node firmware version
  .get("/nodes/:id/firmwareVersion", nodesController.getCurrentFirmwareVersion)
  //get ssh fingerprints
  .get(
    "/nodes/:id/sshpubkeyFingerprint",
    nodesController.getCurrentSshpubkeyFingerprint
  )
  //start node monitoring (change monitoring status to 1)
  .post("/nodes/:id/startMonitoring", nodesController.startNodeMonitoring)
  .post("/nodes/startNodesMonitoring", nodesController.startNodesMonitoring) //multi start monitoring

  .post("/nodes/:id/stopMonitoring", nodesController.stopMonitoring)
  .post("/nodes/stopNodesMonitoring", nodesController.stopNodesMonitoring) //multi stop

  //reboot node
  .post("/nodes/:id/reboot", nodesController.rebootNode)
  .post("/nodes/multiReboot", nodesController.rebootNodes) //bulk reboot

  //Vumeter
  .post("/nodes/:id/startVumeter", nodesController.startVumeter)
  .post("/nodes/startNodesVumeter", nodesController.startNodesVumeter)//bulk

  .get("/nodes/:id/vumeterStatus", nodesController.vumeterStatus)
  .post("/nodes/:id/stopVumeter", nodesController.stopVumeter)
  .post("/nodes/stopNodesVumeter", nodesController.stopNodesVumeter)//bulk

  .get("/nodes/:id/links", nodesController.getNodeLinks)
  .get("/systemStats", nodesController.getSystemStatsForAllNodes)
  .get("/topology", nodesController.getTopology) //fix this to display interface list , links list and olsr list
  .get("/nodes/:id/allTotalBytes", nodesController.getAllTotalBytesMeasures)
  .get("/nodes/:id/lastTotalBytes", nodesController.getLastTotalBytesMeasures)
  .get(
    "/lastTotalBytes",
    nodesController.getLastTotalBytesMeasuresForAllInterfaces
  )
  .get("/nodes/:id/allSnr", nodesController.getAllSnrMeasures)
  .get("/nodes/:id/lastSnr", nodesController.getLastSnrMeasures)
  .get("/lastSnr", nodesController.getLastSnrMeasuresForAllWirelessLinks)

  //________________interfaces _____________
  .get("/interfaces", interfacesController.getInterfaces)
  .get("/interfaces/:id", interfacesController.getInterfaceInfo)
  .put("/interfaces/:id", interfacesController.configureInterface)

  //________________links__________________
  .post("/links/addLinks/:id", linksController.addLink)
  .get("/links", linksController.getLinks)
  .get("/links/:id", linksController.getLinksInfo)
  .delete("/links/:id", linksController.deleteLink)

  //________________antennas__________________
  .put("/antennas/:id", antennasController.configureAntenna)
  .post("/antennas/:id",antennasController.addAntenna)
  .get("/antennas/:id",antennasController.getAntennas)



  //_______________lisences___________________

  .get("/licenses",mockController.getLicenses)

  //missing urls 

  .get("/alarms",mockController.mock)
  .get("/clientIcons",mockController.mock)
  .get("/detectedAlarms",mockController.mock)
  .get("/configurationDrifts",mockController.mock)
  .get("/sshConfigurations",mockController.mock)
  .get("/udid",mockController.mock)
  .get("/icons",mockController.mock)
  .get("/firmwares",mockController.mock)



//__________MQTT PUBLISHER______________

.get("/MQTTSimulationData",MQTTController.publishNodeData);


//update

//delete

//MESHTOOLENDPOINTS :

module.exports = meshRouter;
