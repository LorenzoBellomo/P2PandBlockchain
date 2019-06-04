pragma solidity ^0.5.0;

import "./decreaseLogic.sol";

contract DutchAuction {

    address payable public winner;
    bool public ended;
    uint public reservePrice;
    uint public startPrice;
    uint public duration;
    uint public activationTime;
    DecreaseLogic public decreaseLogic;
    MetaInfo public contractInfo;

    // TODO meta info, change time to blocks
    // handle refunds
    // events

    struct MetaInfo {
        uint id;
        string name;
    }

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
        activationTime = now;
        ended = false;
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