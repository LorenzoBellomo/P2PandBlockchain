pragma solidity ^0.5.0;

import "./decreaseLogic.sol";

contract DutchAuction {

    address payable private owner;
    address payable private winner;
    bool private ended;
    uint private reservePrice;
    uint private startPrice;
    uint private duration;
    uint private activationTime;
    DecreaseLogic private decreaseLogic;
    uint constant graceTime = 2;

    // handle refunds
    // TODO remember grace time on both contracts

    event AuctionEnded(address winner, uint amount);

    constructor(
                uint _startPrice,
                uint _reservePrice,
                uint _duration,
                DecreaseLogic _decreaseLogic
            ) public {
        assert (_startPrice > _reservePrice);

        startPrice = _startPrice;
        reservePrice = _reservePrice;
        duration = _duration;
        decreaseLogic = _decreaseLogic;
        activationTime = block.number;
        ended = false;
        owner = msg.sender;
    }

    function bid() external payable returns (bool) {
        require(!ended, "Sorry, the auction has ended");
        uint nowT = block.number;
        // Considering avg mining time of 15 seconds per block
        require(nowT - activationTime >= graceTime, "Wait until the grace time is over");
        if(nowT - activationTime > duration + graceTime) {
            // The auction has ended, but no one made a bid in time
            winner = address(0);
            ended = true;
            emit AuctionEnded(winner, 0);
            msg.sender.transfer(msg.value);
            return false;
        }
        uint currentPrice = decreaseLogic.
                        computeCurrentPrice(activationTime + graceTime, duration, startPrice, nowT, reservePrice);
        require(msg.value >= currentPrice, "Sorry, current price is higher");
        ended = true;
        winner = msg.sender;
        emit AuctionEnded(winner, currentPrice);
        owner.transfer(currentPrice);
        if(msg.value > currentPrice)
            msg.sender.transfer(msg.value - currentPrice);
    }

    /*function claimDifference() external {
        require(winner == msg.sender, "Only the winner can redeem the difference");
        require(toRefund > 0, "Nothing to refund, sorry!");
        uint toRef = toRefund;
        toRefund = 0;
        msg.sender.transfer(toRef);
    }*/

    /* ------------- Getters from now on ------------- */

    function getReservePrice() external view returns (uint) {
        return reservePrice;
    }

    function getStartPrice() external view returns (uint) {
        return startPrice;
    }

    function getCurrentPrice() external view returns (uint) {
        uint currentPrice = decreaseLogic.
            computeCurrentPrice(activationTime + graceTime, duration, startPrice, block.number, reservePrice);
        return currentPrice;
    }

    function getWinner() external view returns (address) {
        require(!ended, "No winner yet, the auction has not ended");
        return winner;
    }

    function getOwner() external view returns (address) {
        return owner;
    }

    function getDuration() external view returns (uint) {
        return duration;
    }

    function isEnded() external view returns (bool) {
        return ended;
    }

    function getDecreaseLogicDescription() external view returns (string memory) {
        return decreaseLogic.description();
    }
}