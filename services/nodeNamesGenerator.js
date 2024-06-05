
const Nodes = require("../models/nodes");

async function generateUniqueNodeName(originalName) {
  let newName = originalName;
  let nameExists = true;

  while (nameExists) {
    // Check if the generated name already exists in the database
    const existingNode = await Nodes.findOne({
      where: { node_name: newName },
    });

    if (existingNode) {
      // If the name already exists, generate a new unique name
      newName = generateNewName(newName); // Implement a function to generate a new unique name based on originalName
    } else {
      nameExists = false;
    }
  }

  return newName;
}
function generateNewName(originalName) {
  const suffix = generateNumericSuffix(); // Implement a function to generate a unique numeric suffix
  return `${originalName}_${suffix}`;
}


function generateNumericSuffix() {
  const existingSuffixes = []; // Assume this array holds the existing suffixes
  let suffix = Math.floor(Math.random() * 1000); // Generate a random numeric suffix

  while (existingSuffixes.includes(suffix)) {
    suffix = Math.floor(Math.random() * 1000); // Regenerate the suffix if it already exists
  }

  existingSuffixes.push(suffix); // Add the generated suffix to the existing suffixes array
  return suffix;
}
module.exports=generateUniqueNodeName