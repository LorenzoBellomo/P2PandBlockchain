const Migrations = artifacts.require("Migrations");
const vickrey = artifacts.require("VickreyAuction");
const dutch = artifacts.require("DutchAuction");
const decrease = artifacts.require("LinearDecreaseLogic");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
  deployer.deploy(vickrey, 100, 10, 10, 10, 100);
  deployer.deploy(decrease).then(function() {
    return deployer.deploy(dutch, 1000, 100, 10, decrease.address);
  });
};
