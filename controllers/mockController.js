const Licenses = require("../models/licenses")
const { StatusCodes } = require("http-status-codes");
const Logger = require("../utils/logger");
const meshLogger = new Logger("mesh.log");

async function login(req, res) {
  const { login, password, role } = req.body;

  console.log(
    "login = " + login + " password = " + password + " role = " + role
  );

  const response = {
    message: "user logged",
    login: "admin",
    role: "ADMIN",
  };

  res.json(response);
}

async function getLicenses (req, res)  {
  try {
    const licenses = await Licenses.findAll();

    licenses.forEach((l) => {
      const str = `${l.sn_list}`;
      if (str === "") {
        l.sn_list = [];
      } else {
        l.sn_list = str.trim().split(" ");
      }
    });

    res.json(licenses);
  } catch (error) {
         meshLogger.log(`Error retrieving licenses: ${error}`);

    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "An error occurred" });
  }
};

async function mock(req, res) {

meshLogger.log("MOCKED");
  const response = {
    message: "MOCKED"
  };

  res.json(response);
}

module.exports = {
  getLicenses,
  mock,
  login
};