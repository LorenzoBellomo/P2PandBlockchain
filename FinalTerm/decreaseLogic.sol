pragma solidity ^0.5.0;

interface DecreaseLogic {
    function computeCurrentPrice
        (uint startTime,
        uint duration,
        uint startPrice,
        uint nowT,
        uint reservePrice) external pure returns (uint);
}

contract LinearDecreaseLogic is DecreaseLogic {
    function computeCurrentPrice
        (uint startTime,
        uint duration,
        uint startPrice,
        uint nowT,
        uint reservePrice) external pure returns (uint)
    {
        uint percentage = ((nowT - startTime) * 100) / duration;
        uint currentPrice = (percentage * (startPrice - reservePrice)) + startPrice;
        return currentPrice;
    }
}

contract ExponentialDecreaseLogic is DecreaseLogic {
    function computeCurrentPrice
        (uint startTime,
        uint duration,
        uint startPrice,
        uint nowT,
        uint reservePrice) external pure returns (uint)
    {
        uint percentage = ((nowT - startTime) * 100) / duration;
        uint currentPrice = (percentage * (startPrice - reservePrice)) + startPrice;
        return currentPrice;
    }
}