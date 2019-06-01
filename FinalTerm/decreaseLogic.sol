pragma solidity ^0.5.0;

interface DecreaseLogic {
    function computeNewPrice(uint _currentPrice, uint _numBlocks) external pure returns (uint);
}

contract LinearDecreaseLogic is DecreaseLogic {
    function computeNewPrice(uint _currentPrice, uint _numBlocks) external pure returns (uint) {
        return 1;
    }
}