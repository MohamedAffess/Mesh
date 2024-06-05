const { faker, Faker } = require('@faker-js/faker')
const Nodes=require('../models/nodes')
const Interfaces =require('../models/interfaces')


const isIPv4Unique=async (ipAddress)=> {
    const [nodeFound,interfaceFound] = await  Promise.all([
        Nodes.findOne({where:{node_ip_admin:ipAddress}})  ,
        Interfaces.findOne({where:{interface_ip:ipAddress}})

    ])
    
return nodeFound ||interfaceFound|| null
}
async function generateIPv4 () {
    let ipAddress,subnetMask,networkAddress
  while (true) {
    ipAddress = faker.internet.ipv4() // Génère une adresse IPv4 aléatoire
    
    //determiner la classe

    const firstOctet = parseInt(ipAddress.split('.')[0], 10)
    //calculer le masque
    if (firstOctet <= 127) {
      subnetMask = '255.0.0.0'
    } else if (firstOctet >= 128 && firstOctet <= 191) {
      subnetMask = '255.255.0.0'
    } else {
      subnetMask = '255.255.255.0'
    }

    //calcul de l'adresse du sous réseau
    const octets = ipAddress.split('.').map((octet, index) => {
      if (subnetMask.split('.')[index] === '255') {
        return parseInt(octet, 10)
      } else {
        return 0
      }
    })
    networkAddress = octets.join('.')

    const existingIpAddress = await isIPv4Unique(ipAddress)
    if (!existingIpAddress) {
      console.log('Unique IP address')
      break
    }
    
  }
  return {
    ipAddress: ipAddress,
    subnetMask: subnetMask,
    networkAddress: networkAddress
  }
}

module.exports = generateIPv4
