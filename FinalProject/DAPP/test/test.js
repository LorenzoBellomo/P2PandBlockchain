const vickrey = artifacts.require("vickreyAuction");
const dutch = artifacts.require("dutchAuction");
const decrease = artifacts.require("decreaseLogic");

contract("decrease logic", accounts => {
    it("test the correctness of the functions", () => {

        const instance = await decrease.deployed(); 
        
        var result = await instance.computeCurrentPrice(10, 10, 100, 10, 10); 
        assert.equal(result.toNumber(), 100, "Result should be 100 like original start price");

        result = await instance.computeCurrentPrice(10, 10, 100, 20, 10); 
        assert.equal(result.toNumber(), 10, "Result should be 10 like the reserve price");
    }); 
});