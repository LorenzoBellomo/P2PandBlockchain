pragma solidity ^0.5.0;

import { DecreaseLogic } from './decreaseLogic.sol';

contract DutchAuction {
    address payable public owner;
    address payable public winner;
    bool public ended;
    uint public currentPrice;
    uint public reservePrice;
    uint public numBlocks;
    DecreaseLogic public decreaseLogic;
    uint public toRefund;

    event BidEnded(address bidder, uint amount);
    event PriceDropping(uint currentAmount);

    constructor(uint _startPrice, uint _reservePrice, uint _numBlocks, DecreaseLogic _decreaseLogic) public {
        assert (_startPrice > _reservePrice);

        currentPrice = _startPrice;
        reservePrice = _reservePrice;
        numBlocks = _numBlocks;
        decreaseLogic = _decreaseLogic;
        ended = false;
    }

    function decreasePrice() external {
        currentPrice = decreaseLogic.computeNewPrice(currentPrice, numBlocks);
    }

    function bid() external payable {
        require(!ended, "Auction has already ended, sorry!"); // auction not ended
        //require(msg.sender, "You have insufficient funds , sorry!"); //contract has enough money
        require(msg.value >= currentPrice, "Your payment is insufficient for the current bid!"); //payment with more/less money than bid
        ended = true;
        winner = msg.sender;
        emit BidEnded(winner, msg.value);
        // pay owner
        owner.transfer(currentPrice);
        if(msg.value > currentPrice)
            toRefund = msg.value - currentPrice;
    }

    function claimDifference() external {
        require(winner == msg.sender, "Only the winner can redeem the difference");
        require(toRefund > 0, "Nothing to refund, sorry!");
        uint toRef = toRefund;
        toRefund = 0;
        msg.sender.transfer(toRef);
    }
}