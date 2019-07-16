// migrations/1_initial_migration.js

const Migrations = artifacts.require("Migrations");
const vickrey = artifacts.require("VickreyAuction");
const dutch = artifacts.require("DutchAuction");
// If another decrease logic is to be used, change the name here
const decrease = artifacts.require("LinearDecreaseLogic");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
  // Those values are reasonable for a local testing environment, but I suggest to use the ones provided
  // in a comment below if deploying on Ropsten
  
  // Vickrey(reservePrice, commitmentDuration, withdrawalDuration, openingDuration, depositRequirement)
  deployer.deploy(vickrey, 100, 4, 2, 4, 100);
  // deployer.deploy(vickrey, 100, 20, 10, 20, 100); // For Ropsten

  // First I deploy the decrease logic
  deployer.deploy(decrease).then(function() {
    // Then I deploy the dutch auction, passing the decrease logic address as parameter
    // Dutch(startPrice, reservePrice, duration, decreaseLogic)
    return deployer.deploy(dutch, 1000, 100, 10, decrease.address);
    // return deployer.deploy(dutch, 1000, 100, 25, decrease.address); // For ropsten
  });
};
