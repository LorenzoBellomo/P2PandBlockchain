pragma solidity ^0.5.0;

// @FileName: dutchAuction.sol
// @author: Lorenzo Bellomo

import "./decreaseLogic.sol";

// The main methods of the class are at the beginning, while at the end
// are all the getters
contract DutchAuction {

    // This model the phases of the auction
    enum AuctionStatus {NEW, ALIVE, ENDED}

    // The grace time is constant and should be 20 to guarantee around 5
    // minutes of grace time (considering 15 seconds mining time avg)
    // It might be set lower in order to speed up the testing process
    uint constant graceTime = 2;

    address payable private owner;
    address private auctioneer;
    address payable private winner;
    
    AuctionStatus auctionStatus;
    
    // prices
    uint private reservePrice;
    uint private startPrice;
    // timing variables, expressed via number of blocks
    uint private duration;
    uint private activationTime;
    DecreaseLogic private decreaseLogic;

    // This event gets fired whenever an auction ends
    event AuctionEnded(address winner, uint amount);
    // The next one fires when it starts
    event AuctionBegins(uint startPrice, uint reservePrice, uint duration);

    constructor(
                uint _startPrice,
                uint _reservePrice,
                uint _duration,
                DecreaseLogic _decreaseLogic
            ) public {
        require(_startPrice > _reservePrice, "Sorry, wrong arguments, check prices);

        startPrice = _startPrice;
        reservePrice = _reservePrice;
        duration = _duration;
        decreaseLogic = _decreaseLogic;
        auctionStatus = AuctionStatus.NEW;
        owner = msg.sender;
        winner = address(0);
    }

    // New methods, see changelog in the report
    /*
     * This method allows to create the auction, notify the interested bidders 
     * and put the auction in grace period. It explicitely takes the auctioneer 
     * as a parameter to model also auction where the owner is not the auctioneer
     */
    function createAuction(address _auctioneer) external {
        require(owner == msg.sender, "Only the owner decides the auctioneer");
        require(auctionStatus == AuctionStatus.NEW, "Too late to decide");
        auctionStatus = AuctionStatus.ALIVE;
        auctioneer = _auctioneer;
        activationTime = block.number;
        emit AuctionBegins(startPrice, reservePrice, duration)
    }

    /*
     * This method allows to create the auction, notify the interested bidders 
     * and put the auction in grace period. The auctioneer is not passed so 
     * it is set to the owner himself
     */
    function createAuction() external {
        require(owner == msg.sender, "Only the owner decides the auctioneer");
        require(auctionStatus == AuctionStatus.NEW, "Too late to decide");
        auctionStatus = AuctionStatus.ALIVE;
        activationTime = block.number;
        auctioneer = owner;
        emit AuctionBegins(startPrice, reservePrice, duration)
    }

    /*
     * This is the main method of the contract. It first checks if the time range is correct
     * for making bids, and in case it is it simply ends the auction and emits the end event.
     * The check on the phase is made in a lazy way, so the event might not fire in the right
     * moment, but the timing check is always correct.
     */
    function bid() external payable returns (bool) {
        require(auctionStatus == AuctionStatus.ALIVE, "Sorry, wrong phase");
        uint nowT = block.number;
        require(nowT - activationTime >= graceTime, "Wait until the grace time is over");
        if(nowT - activationTime > duration + graceTime) {
            // The auction has ended, but no one made a bid in time
            auctionStatus = AuctionStatus.ENDED;
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
        auctionStatus = AuctionStatus.ENDED;
        winner = msg.sender;
        emit AuctionEnded(winner, currentPrice);
        owner.transfer(currentPrice);
        if(msg.value > currentPrice) // I refund the extra wei that the account gave me
            msg.sender.transfer(msg.value - currentPrice);
        return true;
    }

    /*
     * This method simply checks if the auction is over and it can only be
     * called by the auctioneer
     */
    function checkIfAuctionEnded() external returns (bool) {
        require(msg.sender = auctioneer, "Sorry, only the auctioneer has access to this method");

        if(auctionStatus == AuctionStatus.ENDED) return true;
        if(auctionStatus == AuctionStatus.NEW) return false;

        uint nowT = block.number;
        if(nowT - activationTime > duration + graceTime) {
            // The auction has ended, so no one won
            auctionStatus = AuctionStatus.ENDED;
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
        require(auctionStatus == AuctionStatus.ENDED, "No winner yet, the auction has not ended");
        return winner;
    }

    function getOwner() external view returns (address) {
        return owner;
    }

    function getAuctioneer() external view returns (address) {
        return auctioneer;
    }

    function getDuration() external view returns (uint) {
        return duration;
    }

    function isEnded() external view returns (bool) {
        return auctionStatus == AuctionStatus.ENDED;
    }

    function getCurrentPhase() external view returns (string memory) {
        if(auctionStatus == AuctionStatus.NEW)
            return "Auction created but not started";
        else if(auctionStatus == AuctionStatus.ALIVE) {
            if(block.number - activationTime >= graceTime)
                return "Commitment period";
            else 
                return "Grace period";
        } else
            return "Auction is ended";
    }

    function getDecreaseLogicDescription() external view returns (string memory) {
        return decreaseLogic.description();
    }
}