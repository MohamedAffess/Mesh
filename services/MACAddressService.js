const Nodes =require('../models/nodes')
const Sequelize=require('sequelize')
const Interfaces = require('../models/interfaces')
const isMacAddressUnique=async (macAddress)=>{
    const [nodeFound,interfaceFound]=await Promise.all([
        Nodes.findOne({where:{node_id:macAddress}}),
        Interfaces.findOne({where:{interface_id:macAddress}}),


    ])
    return nodeFound ||interfaceFound || null
}

async function generateUniqueMacAddress () {
  let macAddress

  while (true) {
    //génération aléatoire d'une adresse MAC
    macAddress = [
      0xc4,
      0x4b,
      0xd1,
      Math.floor(Math.random() * 0x7f),
      Math.floor(Math.random() * 0xff),
      Math.floor(Math.random() * 0xff)
    ]
      .map(b => b.toString(16).padStart(2, '0'))
      .join(':')

    const existingMacAddress = await isMacAddressUnique(macAddress)
    if (!existingMacAddress) {
      console.log("Unique MAC Address generated",'\n')
      break
    }

    
  }
  return macAddress
}



module.exports = generateUniqueMacAddress
