pragma solidity ^0.5.0;

import "./DecreaseLogic.sol";

contract DutchAuction {
    address payable public owner;
    address payable public winner;
    bool public ended;
    uint public reservePrice;
    uint public startPrice;
    uint public duration;
    uint public activationTime;
    DecreaseLogic public decreaseLogic;
    MetaInfo public contractInfo;

    struct MetaInfo {
        uint id;
        string name;
    }

    event AuctionEnded(address winner, uint amount);

    constructor(
                uint _startPrice,
                uint _reservePrice,
                uint _duration,
                DecreaseLogic _decreaseLogic,
                address payable _owner) public {
        assert (_startPrice > _reservePrice);

        startPrice = _startPrice;
        reservePrice = _reservePrice;
        duration = _duration;
        decreaseLogic = _decreaseLogic;
        activationTime = now;
        ended = false;
        owner = _owner;
    }

    function bid() external payable returns (bool) {
        require(ended, "Sorry, the auction has ended");
        uint nowT = now;
        require(nowT - activationTime > 300, "Wait until the grace time is over");
        if(nowT - activationTime > duration + 300) {
            winner = address(0);
            ended = true;
            emit AuctionEnded(winner, 0);
            msg.sender.transfer(msg.value);
            return false;
        }
        uint currentPrice = decreaseLogic.
                        computeCurrentPrice(activationTime + 300, duration, startPrice, nowT, reservePrice);
        require(msg.value >= currentPrice, "Sorry, current price is higher");
        ended = true;
        winner = msg.sender;
        emit AuctionEnded(winner, currentPrice);
        // pay owner
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
}