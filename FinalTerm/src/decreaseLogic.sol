pragma solidity ^0.5.0;

// @FileName: decreaseLogic.sol
// @author: Lorenzo Bellomo

/*
 * This file contains both the interface and the sample decrease logics
 * implemented to test the Dutch Auction
 */
interface DecreaseLogic {

    function computeCurrentPrice
        (uint startTime,
        uint duration,
        uint startPrice,
        uint nowT,
        uint reservePrice) external pure returns (uint);

    // Description is like a toString of the decrease logic
    function description() external pure returns (string memory);
}

contract LinearDecreaseLogic is DecreaseLogic {

    // The precision of the position on the x axis (time) is increased by multiplying
    // by working in part per millions, instead of percentages

    function computeCurrentPrice
        (uint startTime,
        uint duration,
        uint startPrice,
        uint nowT,
        uint reservePrice) external pure returns (uint)
    {
        uint ppm = ((nowT - startTime) * 1000000) / duration;
        uint currentPrice = startPrice - ((ppm * (startPrice - reservePrice)) / 1000000);
        return currentPrice;
    }

    function description() external pure returns (string memory) {
        return "Linear";
    }
}

contract ExponentialDecreaseLogic is DecreaseLogic {

    // This is the logarithm (hard coded) of the closest power of two to 1 billion
    uint constant logOneBillion = 30;
    // and this is the closest power of 2
    uint constant power = 1073741824;

    // In order to increase the precision the logarithm is confronted
    // with the closest power of 2 with respect to 1 billion

    function computeCurrentPrice
        (uint startTime,
        uint duration,
        uint startPrice,
        uint nowT,
        uint reservePrice) external pure returns (uint)
    {
        uint ppb = (((nowT - startTime) * 1073741824) / duration);
        uint a = (1000*log2(ppb))/logOneBillion;
        uint currentPrice = startPrice - ((a*(startPrice-reservePrice)) / 1000);
        return currentPrice;
    }

    /*
     * This is a log in base 2 implementation that I copied from a forum online, its cost
     * is fixed and is around 757 wei (I suppose it might depend from the compiler chosen).
     * It ceils to the closest integer
     */
    function log2(uint x) private pure returns (uint y){
        // Cost is fixed and is 757 wei
        assembly {
            let arg := x
            x := sub(x,1)
            x := or(x, div(x, 0x02))
            x := or(x, div(x, 0x04))
            x := or(x, div(x, 0x10))
            x := or(x, div(x, 0x100))
            x := or(x, div(x, 0x10000))
            x := or(x, div(x, 0x100000000))
            x := or(x, div(x, 0x10000000000000000))
            x := or(x, div(x, 0x100000000000000000000000000000000))
            x := add(x, 1)
            let m := mload(0x40)
            mstore(m,           0xf8f9cbfae6cc78fbefe7cdc3a1793dfcf4f0e8bbd8cec470b6a28a7a5a3e1efd)
            mstore(add(m,0x20), 0xf5ecf1b3e9debc68e1d9cfabc5997135bfb7a7a3938b7b606b5b4b3f2f1f0ffe)
            mstore(add(m,0x40), 0xf6e4ed9ff2d6b458eadcdf97bd91692de2d4da8fd2d0ac50c6ae9a8272523616)
            mstore(add(m,0x60), 0xc8c0b887b0a8a4489c948c7f847c6125746c645c544c444038302820181008ff)
            mstore(add(m,0x80), 0xf7cae577eec2a03cf3bad76fb589591debb2dd67e0aa9834bea6925f6a4a2e0e)
            mstore(add(m,0xa0), 0xe39ed557db96902cd38ed14fad815115c786af479b7e83247363534337271707)
            mstore(add(m,0xc0), 0xc976c13bb96e881cb166a933a55e490d9d56952b8d4e801485467d2362422606)
            mstore(add(m,0xe0), 0x753a6d1b65325d0c552a4d1345224105391a310b29122104190a110309020100)
            mstore(0x40, add(m, 0x100))
            let magic := 0x818283848586878898a8b8c8d8e8f929395969799a9b9d9e9faaeb6bedeeff
            let shift := 0x100000000000000000000000000000000000000000000000000000000000000
            let a := div(mul(x, magic), shift)
            y := div(mload(add(m,sub(255,a))), shift)
            y := add(y, mul(256, gt(arg, 0x8000000000000000000000000000000000000000000000000000000000000000)))
        }
    }

    function description() external pure returns (string memory) {
        return "Exponential";
    }
}

contract LogarithmicDecreaseLogic is DecreaseLogic {

    // This is the logarithm (hard coded) of the closest power of two to 1 billion
    uint constant logOneBillion = 30;
    // and this is the closest power of 2
    uint constant power = 1073741824;

    // In order to increase the precision the logarithm is confronted
    // with the closest power of 2 with respect to 1 billion

    function computeCurrentPrice
        (uint startTime,
        uint duration,
        uint startPrice,
        uint nowT,
        uint reservePrice) external pure returns (uint)
    {
        uint ppb = (((duration - nowT + startTime) * 1073741824) / duration);
        uint a = (1000*log2(ppb))/logOneBillion;
        uint currentPrice = ((a*(startPrice-reservePrice)) / 1000) + reservePrice;
        return currentPrice;
    }

    /*
     * This is a log in base 2 implementation that I copied from a forum online, its cost
     * is fixed and is around 757 wei (I suppose it might depend from the compiler chosen).
     * It ceils to the closest integer
     */
    function log2(uint x) private pure returns (uint y){
        // Cost is fixed and is 757 wei
        assembly {
            let arg := x
            x := sub(x,1)
            x := or(x, div(x, 0x02))
            x := or(x, div(x, 0x04))
            x := or(x, div(x, 0x10))
            x := or(x, div(x, 0x100))
            x := or(x, div(x, 0x10000))
            x := or(x, div(x, 0x100000000))
            x := or(x, div(x, 0x10000000000000000))
            x := or(x, div(x, 0x100000000000000000000000000000000))
            x := add(x, 1)
            let m := mload(0x40)
            mstore(m,           0xf8f9cbfae6cc78fbefe7cdc3a1793dfcf4f0e8bbd8cec470b6a28a7a5a3e1efd)
            mstore(add(m,0x20), 0xf5ecf1b3e9debc68e1d9cfabc5997135bfb7a7a3938b7b606b5b4b3f2f1f0ffe)
            mstore(add(m,0x40), 0xf6e4ed9ff2d6b458eadcdf97bd91692de2d4da8fd2d0ac50c6ae9a8272523616)
            mstore(add(m,0x60), 0xc8c0b887b0a8a4489c948c7f847c6125746c645c544c444038302820181008ff)
            mstore(add(m,0x80), 0xf7cae577eec2a03cf3bad76fb589591debb2dd67e0aa9834bea6925f6a4a2e0e)
            mstore(add(m,0xa0), 0xe39ed557db96902cd38ed14fad815115c786af479b7e83247363534337271707)
            mstore(add(m,0xc0), 0xc976c13bb96e881cb166a933a55e490d9d56952b8d4e801485467d2362422606)
            mstore(add(m,0xe0), 0x753a6d1b65325d0c552a4d1345224105391a310b29122104190a110309020100)
            mstore(0x40, add(m, 0x100))
            let magic := 0x818283848586878898a8b8c8d8e8f929395969799a9b9d9e9faaeb6bedeeff
            let shift := 0x100000000000000000000000000000000000000000000000000000000000000
            let a := div(mul(x, magic), shift)
            y := div(mload(add(m,sub(255,a))), shift)
            y := add(y, mul(256, gt(arg, 0x8000000000000000000000000000000000000000000000000000000000000000)))
        }
    }

    function description() external pure returns (string memory) {
        return "Logarithmic";
    }
}