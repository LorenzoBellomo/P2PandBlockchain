const Migrations = artifacts.require("Migrations");
const vickrey = artifacts.require("vickreyAuction");
const dutch = artifacts.require("dutchAuction");
const decrease = artifacts.require("decreaseLogic");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
  deployer.deploy(vickrey);
  deployer.deploy(dutch);
  deployer.deploy(decrease);
};
