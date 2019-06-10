pragma solidity ^0.5.0;

// @author: Lorenzo Bellomo

import "./decreaseLogic.sol";

// The main methods of the class are at the beginning, while at the end
// are all the getters
contract DutchAuction {

    // The grace time is constant and should be 20 to guarantee around 5
    // minutes of grace time (considering 15 seconds mining time avg)
    // It might be set lower in order to speed up the testing process
    uint constant graceTime = 2;

    address payable private owner;
    address payable private winner;
    // ended becomes true when the auction ends
    bool private ended;
    // prices
    uint private reservePrice;
    uint private startPrice;
    // timing variables, expressed via number of blocks
    uint private duration;
    uint private activationTime;
    DecreaseLogic private decreaseLogic;

    // This event gets fired whenever an auction ends
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
        winner = address(0);
    }

    /*
     * This is the main method of the contract. It first checks if the time range is correct
     * for making bids, and in case it is it simply ends the auction and emits the end event.
     * The check on the phase is made in a lazy way, so the event might not fire in the right
     * moment, but the timing check is always correct.
     */
    function bid() external payable returns (bool) {
        require(!ended, "Sorry, the auction has ended");
        uint nowT = block.number;
        require(nowT - activationTime >= graceTime, "Wait until the grace time is over");
        if(nowT - activationTime > duration + graceTime) {
            // The auction has ended, but no one made a bid in time
            ended = true;
            emit AuctionEnded(winner, 0);
            // I refund the bidder account and return false to signal that
            // the transaction failed
            msg.sender.transfer(msg.value);
            return false;
        }
        // In this case I am in the right time span to make bids
        uint currentPrice = decreaseLogic.
                        computeCurrentPrice(activationTime + graceTime, duration, startPrice, nowT, reservePrice);

        assert(currentPrice >= reservePrice);
        // I have computed the current price, but I have to check that enough ether was passed
        require(msg.value >= currentPrice, "Sorry, current price is higher");
        // At this point I'm sure that I had enough money to end the auction
        ended = true;
        winner = msg.sender;
        emit AuctionEnded(winner, currentPrice);
        owner.transfer(currentPrice);
        if(msg.value > currentPrice) // I refund the extra wei that the account gave me
            msg.sender.transfer(msg.value - currentPrice);
        return true;
    }

    /*
     * This method simply checks if the auction is over and it can only be
     * called by the auction owner
     */
    function checkIfAuctionEnded() external returns (bool) {
        require(msg.sender == owner, "Sorry, only the owner has access to this method");

        if(ended) return true;

        uint nowT = block.number;
        if(nowT - activationTime > duration + graceTime) {
            // The auction has ended, so no one won
            ended = true;
            emit AuctionEnded(winner, 0);
            return true;
        }
        return false;
    }

    /* ------------- Getters from now on ------------- */

    function getReservePrice() external view returns (uint) {
        return reservePrice;
    }

    function getStartPrice() external view returns (uint) {
        return startPrice;
    }

    function getCurrentPrice() external view returns (uint) {
        require(block.number - activationTime >= graceTime && block.number - activationTime < duration + graceTime,
                "Sorry, not yet in the auction main phase");
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