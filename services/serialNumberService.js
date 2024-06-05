const Nodes =require('../models/nodes')
const Sequelize=require('sequelize')
async function isSerialNumberUnique(serialNumber) {
    const nodeFound= await Nodes.findOne({where:{node_sn:serialNumber}})

    return nodeFound || null

}
async function generateUniqueSerialNumber(){
    let serialNumber=''
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const charactersLength = characters.length;
while(true){
    
    for (let i = 0; i < 21; i++) {
        serialNumber += characters.charAt(Math.floor(Math.random() * charactersLength));
      }
        // Check if the generated serial number is unique
      const existingNode = await isSerialNumberUnique(serialNumber)

      if(!existingNode){
        console.log("Unique Serial Number Generated",'\n')
        break
      }



    }

        return serialNumber
       
    
}

module.exports = generateUniqueSerialNumber