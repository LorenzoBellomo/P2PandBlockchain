pragma solidity ^0.5.0;

// @author: Lorenzo Bellomo

contract VickreyAuction {

    // This model the phases of the auction
    enum AuctionStatus {GRACE, COMMITMENT, WITHDRAWAL, OPENING, ENDED, FINALIZED}
    // This model the "state" of a single bid, where PAID means that I refunded
    // all the pending money and I no longer owe that account
    enum BidStatus {NOTEXISTING, COMMITED, WITHDRAWN, OPEN, PAID}

    // hash is the commitment "box", status is the one before and pending
    // refund is the amount that was paid by an account until one moment
    struct Commitment {
        bytes32 hash;
        BidStatus status;
        uint pendingRefund;
    }

    // The grace time is constant and should be 20 to guarantee around 5
    // minutes of grace time (considering 15 seconds mining time avg)
    // It might be set lower in order to speed up the testing process
    uint constant graceTime = 2;

    // addresses, the auctioneer and the owner are considered to be
    // the same account
    address payable private winner;
    address payable private owner;

    // prices
    uint private reservePrice;
    uint private topPayment;
    uint private winningPrice;
    uint private depositRequirement;

    // time related variables, expressed in number of blocks
    uint private commitmentDuration;
    uint private withdrawalDuration;
    uint private openingDuration;
    uint private activationTime;

    // The current status of the whole auction (updated in a lazy way)
    AuctionStatus private auctionStatus;

    // mapping from address to commitments, with associated array to
    // loop over this collection
    mapping (address => Commitment) private commitments;
    address payable[] possibleRefunds;

    // number of currently active commitments on this auction
    // it is basically (numCommitments - numWithdrawals)
    uint private commitmentCount;

    // the events below are the ones related to phase switch
    event GraceTimeOver(uint reservePrice, uint depositRequirement, uint commitmentDuration);
    event CommitmentOver(uint withdrawalDuration);
    event WithdrawalOver(uint openingDuration);
    event AuctionEnded(address winner, uint amount);

    // the events below are emitted for each new bidder / withdrawer
    event NewCommitment(address bidder, bytes32 secret, uint liveBidders);
    event NewWithdrawal(address withdrawer, uint liveBidders);

    constructor(
                uint _reservePrice,
                uint _commitmentDuration,
                uint _withdrawalDuration,
                uint _openingDuration,
                uint _depositRequirement
            ) public {

        reservePrice = _reservePrice;
        withdrawalDuration = _withdrawalDuration;
        commitmentDuration = _commitmentDuration;
        openingDuration = _openingDuration;
        depositRequirement = _depositRequirement;
        activationTime = block.number;
        auctionStatus = AuctionStatus.GRACE;
        owner = msg.sender;
        commitmentCount = 0;
        topPayment = 0;
        winningPrice = reservePrice;
    }

    /*
     * This function is only accepted when in commitment phase
     */
    function bid(bytes32 hash) external payable {

        // First thing I do is check the current phase.
        changeAuctionPhase(block.number);
        // At this point auctionStatus is updated
        require(auctionStatus == AuctionStatus.COMMITMENT, "Sorry, current phase is not commitment");
        require(msg.value >= depositRequirement, "Sorry, You forgot to pay the deposit");

        // At this point the commitment is successful, I record everything
        commitmentCount++;
        commitments[msg.sender] = Commitment(hash, BidStatus.COMMITED, msg.value - depositRequirement);
        possibleRefunds.push(msg.sender);

        // And I emit an event for the new commitment
        emit NewCommitment(msg.sender, hash, commitmentCount);
    }

    /*
     * This function is only accepted when in withdrawal phase
     */
    function withdraw() external {

        // First thing I do is check the current phase.
        changeAuctionPhase(block.number);
        // At this point auctionStatus is updated
        require(auctionStatus == AuctionStatus.WITHDRAWAL, "Sorry, current phase is not withdrawal");
        // I have to find his commitment
        require(commitments[msg.sender].status == BidStatus.COMMITED, "Your transaction was not found");

        // I found the commitment, I record that it was withdrawn and I record that I have
        // to send back half the deposit
        commitments[msg.sender].status = BidStatus.WITHDRAWN;
        commitments[msg.sender].pendingRefund += depositRequirement / 2;
        commitmentCount--;

        // Now I emit the event signaling the withdrawal
        emit NewWithdrawal(msg.sender, commitmentCount);
    }

    /*
     * This function is only accepted while in the opening phase
     */
    function open(uint nonce) external payable returns (bool) {

        // First thing I do is check the current phase.
        changeAuctionPhase(block.number);
        // At this point auctionStatus is updated
        require(auctionStatus == AuctionStatus.OPENING, "Sorry, current phase is not opening");
        Commitment memory comm = commitments[msg.sender];
        // I have to check that it was not already open or withdrawn
        require(comm.status == BidStatus.COMMITED, "Sorry, your commitment is not valid");
        bytes32 hash = keccak256(abi.encodePacked(nonce, msg.value));
        require(hash == comm.hash, "Sorry, your hash value does not coincide with the commitment one");

        // At this point the commitment was valid, I have to see if this might be a winner

        if(msg.value > topPayment) {
            // Than it is the current winner
            winner = msg.sender;
            winningPrice = topPayment;
            topPayment = msg.value;
            commitments[msg.sender].status = BidStatus.OPEN;
            // I save the fact that I might have to refund this value
            // and will handle the actual winner in a different manner
            commitments[msg.sender].pendingRefund += msg.value;
            // return true means that the sender is a winner contender
            return true;
        } else {
            // I refund the user immediatly
            if(msg.value > winningPrice) // I have to update the second best cost
                winningPrice = msg.value;
            msg.sender.transfer(commitments[msg.sender].pendingRefund + msg.value);
            commitments[msg.sender].pendingRefund = 0;
            commitments[msg.sender].status = BidStatus.PAID;
            // false means I was refunded and cannot win
            return false;
        }

    }

    function finalize() external {
        // TODO fix refunds of initial fund, and comment
        require(msg.sender == owner, "Only the owner can finalize an auction");
        changeAuctionPhase(block.number);
        require(auctionStatus == AuctionStatus.ENDED, "Sorry, too early to call finalize");
        auctionStatus = AuctionStatus.FINALIZED;
        for(uint i = 0; i < possibleRefunds.length; i++) {
            Commitment memory comm = commitments[possibleRefunds[i]];
            if(comm.status != BidStatus.PAID) {
                if(possibleRefunds[i] == winner) {
                    winner.transfer(comm.pendingRefund - winningPrice);
                    commitments[winner].pendingRefund = 0;
                    commitments[winner].status = BidStatus.PAID;
                } else {
                    possibleRefunds[i].transfer(comm.pendingRefund);
                    commitments[possibleRefunds[i]].pendingRefund = 0;
                    commitments[possibleRefunds[i]].status = BidStatus.PAID;
                }
            }
        }
    }

    function changeAuctionPhase(uint nowT) private {

        uint timeDiff = nowT - activationTime;
        uint prev = uint(auctionStatus);

        if(timeDiff < graceTime) {
            auctionStatus = AuctionStatus.GRACE;
        } else if(timeDiff < commitmentDuration + graceTime) {
            auctionStatus = AuctionStatus.COMMITMENT;
        } else if(timeDiff < withdrawalDuration + graceTime + commitmentDuration) {
            auctionStatus = AuctionStatus.WITHDRAWAL;
        } else if(timeDiff < withdrawalDuration + graceTime + commitmentDuration + openingDuration) {
            auctionStatus = AuctionStatus.OPENING;
        } else {
            auctionStatus = AuctionStatus.ENDED;
        }

        uint diff = uint(auctionStatus) - prev;

        while(diff > 0) {
            if(prev == uint(AuctionStatus.GRACE))
                emit GraceTimeOver(reservePrice, depositRequirement, commitmentDuration);
            else if(prev == uint(AuctionStatus.COMMITMENT))
                emit CommitmentOver(withdrawalDuration);
            else if(prev == uint(AuctionStatus.WITHDRAWAL))
                emit WithdrawalOver(openingDuration);
            else if(prev == uint(AuctionStatus.OPENING))
                emit AuctionEnded(winner, winningPrice);
            else
                diff = 1;
            prev++;
            diff--;
        }

    }

    function updateCurrentPhase() external {
        require(msg.sender == owner, "This function is restricted to the auction owner");
        changeAuctionPhase(block.number);
    }

    /* ------------- Getters from now on ------------- */

    function getCurrentWinner() external view returns (address) {
        return winner;
    }

    function getOwner() external view returns (address) {
        return owner;
    }

    function getReservePrice() external view returns (uint) {
        return reservePrice;
    }

    function getCurrentTopPayment() external view returns (uint) {
        return topPayment;
    }

    function getCurrentWinningPrice() external view returns (uint) {
        return winningPrice;
    }

    function getCommitmentDuration() external view returns (uint) {
        return commitmentDuration;
    }

    function getWithdrawalDuration() external view returns (uint) {
        return withdrawalDuration;
    }

    function getGraceTimeDuration() external pure returns (uint) {
        return graceTime;
    }

    function getOpeningDuration() external view returns (uint) {
        return openingDuration;
    }

    function getNumberOfBidders() external view returns (uint) {
        return commitmentCount;
    }

    function getCurrentPhase() external view returns (string memory) {
        if(auctionStatus == AuctionStatus.GRACE)
            return "Grace period";
        else if(auctionStatus == AuctionStatus.COMMITMENT)
            return "Commitment period";
        else if(auctionStatus == AuctionStatus.WITHDRAWAL)
            return "Withdrawal period";
        else if(auctionStatus == AuctionStatus.OPENING)
            return "Opening period";
        else
            return "Auction is ended";
    }

    function getCommitmentStatus(address addr) external view returns (string memory) {
        Commitment memory comm = commitments[addr];
        if(comm.status == BidStatus.NOTEXISTING)
            return "This commitment does not exist";
        else if(comm.status == BidStatus.COMMITED)
            return "This commitment is valid and not opened yet";
        else if(comm.status == BidStatus.WITHDRAWN)
            return "This commitment was withdrawn";
        else if(comm.status == BidStatus.OPEN) {
            if(winner == addr)
                return "This commitment is currently winning";
            else
                return "This commitment was opened, but is not winning";
        } else {
            if(winner == addr)
                return "This commitment has won!";
            else
                return "This commitment has been refunded";
        }
    }

}
