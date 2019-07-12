pragma solidity ^0.5.0;

// @FileName: vickreyAuction.sol
// @author: Lorenzo Bellomo

contract VickreyAuction {

    // This model the phases of the auction
    enum AuctionStatus {NEW, GRACE, COMMITMENT, WITHDRAWAL, OPENING, ENDED, FINALIZED}
    // This model the "state" of a single bid, where PAID means that I refunded
    // all the pending money and I no longer owe that account
    enum BidStatus {NOT_EXISTING, COMMITED, WITHDRAWN, OPEN, PAID}

    // Return codes, surely lost is returned to a bid which is already not
    //  the best one
    enum ReturnCode {OK, WRONG_PHASE, INSUFFICIENT_FUNDS, NOT_FOUND,
                    NOT_VALID, SURELY_LOST, NOT_ALLOWED}

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

    // addresses related to the contracts
    address payable private winner;
    address payable private owner;
    address private auctioneer;

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
    address payable[] private possibleRefunds;

    // number of currently active commitments on this auction
    // it is basically (numCommitments - numWithdrawals)
    uint private commitmentCount;

    // the events below are the ones related to phase switch
    event AuctionBegins(uint reservePrice, uint depositRequirement, uint graceTime);
    event GraceTimeOver(uint reservePrice, uint depositRequirement, uint commitmentDuration);
    event CommitmentOver(uint withdrawalDuration, uint liveBidders);
    event WithdrawalOver(uint openingDuration, uint liveBidders);
    event AuctionEnded(address winner, uint amount);

    // the events below are emitted for each new bidder / withdrawer
    // and newLeader that is emitted during the opening phase every time
    // an opening becomes the new leader
    event NewCommitment(address bidder, bytes32 secret, uint liveBidders);
    event NewWithdrawal(address withdrawer, uint liveBidders);
    event NewLeader(address currentWinner, uint topPayment);

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
        auctionStatus = AuctionStatus.NEW;
        owner = msg.sender;
        commitmentCount = 0;
        topPayment = 0;
        winningPrice = reservePrice;
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
        auctionStatus = AuctionStatus.GRACE;
        auctioneer = _auctioneer;
        activationTime = block.number;
        emit AuctionBegins(reservePrice, depositRequirement, graceTime);
    }

    /*
     * This method allows to create the auction, notify the interested bidders
     * and put the auction in grace period. The auctioneer is not passed so
     * it is set to the owner himself
     */
    function createAuction() external {
        require(owner == msg.sender, "Only the owner decides the auctioneer");
        require(auctionStatus == AuctionStatus.NEW, "Too late to decide");
        auctionStatus = AuctionStatus.GRACE;
        activationTime = block.number;
        auctioneer = owner;
        emit AuctionBegins(reservePrice, depositRequirement, graceTime);
    }

    /* ------------ below is the only provided modifier ---------------- */

     /*
     * This is the main method used to switch from a phase to another.
     * It is invoked in two ways:
     * - Every time one of the main methods is called (bid, withdraw, open)
     * - At any time by the auction owner through the method updateCurrentPhase below
     * It takes as parameter the current block number and computes which phase is
     * currently ongoing. It emits one event for each phase that is passed until now
     * and that was not emitted before because of the lazy evaluation.
     * This means that functions are guaranteed to respect the contract with respect to
     * time, but events may fire late
     * This is not a view Function since it writes the auctionStatus variable
     */
    modifier changeAuctionPhase(uint nowT) {

        // I have to check for the state only if the auction is not ended
        if(auctionStatus < AuctionStatus.ENDED && auctionStatus != AuctionStatus.NEW) {

            uint timeDiff = nowT - activationTime;
            // I use the integer below the enum to compute the number of phases passed
            // The association is done starting by 0 (GRACE = 0, COMMITMENT = 1...)
            uint prev = uint(auctionStatus);

            // Below is just a way to compute in which phase I am now, I store the current
            // phase int he auctionStatus variable on the blockchain
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

            // diff will be the number of phases passed
            uint diff = uint(auctionStatus) - prev;

            while(diff > 0) {
                // I have to emit an event for each phase that is passed
                // So I match the previous event and I emit its relative event
                if(prev == uint(AuctionStatus.GRACE))
                    emit GraceTimeOver(reservePrice, depositRequirement, commitmentDuration);
                else if(prev == uint(AuctionStatus.COMMITMENT))
                    emit CommitmentOver(withdrawalDuration, commitmentCount);
                else if(prev == uint(AuctionStatus.WITHDRAWAL))
                    emit WithdrawalOver(openingDuration, commitmentCount);
                else if(prev == uint(AuctionStatus.OPENING))
                    emit AuctionEnded(winner, winningPrice);
                else
                    break;
                // I have emitted the event, now I need to check if I have to emit
                // the next one
                prev++;
                diff--;
            }
        }
        // After that I execute the code of the function
        _;

    }

    /*
     * This function is only accepted when in commitment phase
     */
    function bid(bytes32 hash) external payable changeAuctionPhase(block.number) returns (ReturnCode) {

        // At this point auctionStatus is updated
        if(auctionStatus != AuctionStatus.COMMITMENT)
            return ReturnCode.WRONG_PHASE;
        if(msg.value < depositRequirement)
            return ReturnCode.INSUFFICIENT_FUNDS;
        if(commitments[msg.sender].status != BidStatus.NOT_EXISTING)
            return ReturnCode.NOT_VALID;

        // At this point the commitment is successful, I record everything
        commitmentCount++;
        // I save that I might have to refund msg.value, This is the deposit plus
        // the extra ether that he gave me. If he withdraws I will handle this
        // case accordingly
        commitments[msg.sender] = Commitment(hash, BidStatus.COMMITED, msg.value);
        possibleRefunds.push(msg.sender);

        // And I emit an event for the new commitment
        emit NewCommitment(msg.sender, hash, commitmentCount);
    }

    /*
     * This function is only accepted when in withdrawal phase
     */
    function withdraw() external changeAuctionPhase(block.number) returns (ReturnCode) {

        // At this point auctionStatus is updated
        if(auctionStatus != AuctionStatus.WITHDRAWAL)
            return ReturnCode.WRONG_PHASE;
        // I have to find his commitment
        if(commitments[msg.sender].status != BidStatus.COMMITED)
            return ReturnCode.NOT_FOUND;

        // I found the commitment, I record that it was withdrawn and I record that I have
        // to send back half the deposit
        commitments[msg.sender].status = BidStatus.WITHDRAWN;
        // In pending refund I have a whole deposit, I have to cut half of it
        commitments[msg.sender].pendingRefund -= depositRequirement / 2;
        commitmentCount--;

        // Now I emit the event signaling the withdrawal
        emit NewWithdrawal(msg.sender, commitmentCount);
    }

    /*
     * This function is only accepted while in the opening phase
     */
    function open(uint nonce) external changeAuctionPhase(block.number) payable returns (ReturnCode) {

        // At this point auctionStatus is updated
        if(auctionStatus != AuctionStatus.OPENING)
            return ReturnCode.WRONG_PHASE;
        Commitment memory comm = commitments[msg.sender];
        // I have to check that it was not already open or withdrawn
        if(comm.status != BidStatus.COMMITED)
            return ReturnCode.NOT_FOUND;
        bytes32 hash = keccak256(abi.encodePacked(nonce, msg.value));
        if(hash != comm.hash || msg.value < reservePrice) {
            // I was sent an invalid bid, I record that this account doesn't get a refund
            commitments[msg.sender].status = BidStatus.PAID;
            commitments[msg.sender].pendingRefund = 0;
            return ReturnCode.NOT_VALID;
        }
        // At this point the commitment was valid, I have to see if this might be a winner

        if(msg.value > topPayment) {
            // Then it is the current winner
            winner = msg.sender;
            if(topPayment != 0)
                winningPrice = topPayment;
            topPayment = msg.value;
            commitments[msg.sender].status = BidStatus.OPEN;
            // I save the fact that I might have to refund this value
            // and will handle the actual winner in a different manner
            commitments[msg.sender].pendingRefund += msg.value;
            // I emit the event regarding the new auction leader
            emit NewLeader(msg.sender, topPayment);
            return ReturnCode.OK;
        } else {
            // I refund the user immediatly
            if(msg.value > winningPrice) // I have to update the second best cost
                winningPrice = msg.value;
            commitments[msg.sender].status = BidStatus.PAID;
            msg.sender.transfer(commitments[msg.sender].pendingRefund + msg.value);
            commitments[msg.sender].pendingRefund = 0;
            // false means the bidder was refunded and cannot win
            return ReturnCode.SURELY_LOST;
        }

    }

    function finalize() external changeAuctionPhase(block.number) returns (ReturnCode) {

        if(msg.sender != owner)
            return ReturnCode.NOT_ALLOWED;
        if(auctionStatus != AuctionStatus.ENDED)
            return ReturnCode.WRONG_PHASE;
        // At this point I'm sure that I can finalize
        auctionStatus = AuctionStatus.FINALIZED;
        for(uint i = 0; i < possibleRefunds.length; i++) {
            // for each participant I check his commitment, and see if
            // he needs to be refunded
            Commitment memory comm = commitments[possibleRefunds[i]];
            if(comm.status == BidStatus.OPEN || comm.status == BidStatus.WITHDRAWN) {
                // I only refund OPEN or WITHDRAWN bids (so I do not refund
                // commited bids or already refunded ones)
                commitments[possibleRefunds[i]].status = BidStatus.PAID;
                if(possibleRefunds[i] == winner) {
                    // If he is the winner, I have to remove from the pending
                    // refund the winning amount, but I can give him back
                    // the whole deposit and the extra
                    winner.transfer(comm.pendingRefund - winningPrice);
                } else {
                    // Not a winner, so I can transfer the whole amount of money
                    possibleRefunds[i].transfer(comm.pendingRefund);
                }
                commitments[possibleRefunds[i]].pendingRefund = 0;
            }
        }
        // Now I have to pay the owner
        if(winner != address(0))
            owner.transfer(winningPrice);
    }

    /*
     * This method simply calls the function that checks if it has to change the auction time
     */
    function updateCurrentPhase() external changeAuctionPhase(block.number) {
    }

    /*
     * Utility function to compute easily and consistently the hash of the amount
     * and of the nonce. Previously in Util.sol
     */
    function getKeccak(uint nonce, uint amount) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(nonce, amount));
    }


    /* ------------- Getters from now on ------------- */

    function getCurrentWinner() external view returns (address) {
        return winner;
    }

    function getOwner() external view returns (address) {
        return owner;
    }

    function getAuctioneer() external view returns (address) {
        return auctioneer;
    }

    function getReservePrice() external view returns (uint) {
        return reservePrice;
    }

    function getDeposit() external view returns (uint) {
        return depositRequirement;
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
        if(auctionStatus == AuctionStatus.NEW)
            return "New inactive auction";
        else if(auctionStatus == AuctionStatus.GRACE)
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
        if(comm.status == BidStatus.NOT_EXISTING)
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

    function getMyCommitmentStatus() external view returns (string memory) {
        Commitment memory comm = commitments[msg.sender];
        if(comm.status == BidStatus.NOT_EXISTING)
            return "This commitment does not exist";
        else if(comm.status == BidStatus.COMMITED)
            return "This commitment is valid and not opened yet";
        else if(comm.status == BidStatus.WITHDRAWN)
            return "This commitment was withdrawn";
        else if(comm.status == BidStatus.OPEN) {
            if(winner == msg.sender)
                return "This commitment is currently winning";
            else
                return "This commitment was opened, but is not winning";
        } else {
            if(winner == msg.sender)
                return "This commitment has won!";
            else
                return "This commitment has been refunded";
        }
    }

    function getCommitmentPendingRefunds(address addr) external view returns (uint) {
        Commitment memory comm = commitments[addr];
        require(comm.status != BidStatus.NOT_EXISTING, "Bid not found");
        return comm.pendingRefund;
    }

    function getMyCommitmentPendingRefunds() external view returns (uint) {
        Commitment memory comm = commitments[msg.sender];
        require(comm.status != BidStatus.NOT_EXISTING, "Bid not found");
        return comm.pendingRefund;
    }

    function getMyCommitmentHash() external view returns (bytes32) {
        Commitment memory comm = commitments[msg.sender];
        require(comm.status != BidStatus.NOT_EXISTING, "Bid not found");
        return comm.hash;
    }

    function getCommitmentHash(address addr) external view returns (bytes32) {
        Commitment memory comm = commitments[addr];
        require(comm.status != BidStatus.NOT_EXISTING, "Bid not found");
        return comm.hash;
    }

}
