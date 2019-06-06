pragma solidity ^0.5.0;

contract VickreyAuction {

    struct Commitment {
        bytes32 hash;
        uint nonce;
        uint amount;
        bool alive;
    }

    enum AuctionStatus {GRACE, COMMITMENT, WITHDRAWAL, OPENING, ENDED}
    uint constant graceTime = 2;

    address payable private winner;
    address payable private owner;
    uint private reservePrice;
    uint private commitmentDuration;
    uint private withdrawalDuration;
    uint private openingDuration;
    uint private depositRequirement;
    uint private activationTime;
    AuctionStatus private auctionStatus;
    mapping (address => Commitment) commitments;
    uint commitmentCount;

    event GraceTimeOver();
    event CommitmentOver();
    event WithdrawalOver();
    event AuctionEnded(address winner, uint amount);

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
        activationTime = now;
        auctionStatus = AuctionStatus.GRACE;
        owner = msg.sender;
        commitmentCount = 0;
    }

    function bid(bytes32 hash) external payable returns (bool) {
        uint nowT = block.number;
        require(nowT - activationTime >= graceTime, "Wait until the grace time is over");

        changeAuctionTime(nowT);
        require(auctionStatus == AuctionStatus.COMMITMENT, "Sorry, commitment phase is over, no more bids");

        // TODO payment of small fund
        // TODO events both here and in withdrawal
        commitmentCount++;
        commitments[msg.sender] = Commitment(hash, 0, 0, true);
        emit NewCommitment(msg.sender, hash, commitmentCount);
    }

    function withdraw() external payable returns (bool) {
        uint nowT = block.number;

        changeAuctionTime(nowT);
        require(auctionStatus == AuctionStatus.WITHDRAWAL, "Sorry, withdrawal phase is over");

        if(commitments[msg.sender].alive) {
            commitments[msg.sender].alive = false;
            commitmentCount--;
            emit NewWithdrawal(msg.sender, commitmentCount);
        }
    }

    function changeAuctionTime(uint nowT) private {

        uint timeDiff = nowT - activationTime;
        AuctionStatus prev = auctionStatus;

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

        uint diff = uint(auctionStatus) - uint(prev);

        while(diff > 0) {
            if(prev == AuctionStatus.GRACE) {
                emit GraceTimeOver();
                prev = AuctionStatus.COMMITMENT;
                diff--;
            }
            if(prev == AuctionStatus.COMMITMENT) {
                emit CommitmentOver();
                prev = AuctionStatus.WITHDRAWAL;
                diff--;
            }
            if(prev == AuctionStatus.WITHDRAWAL) {
                emit WithdrawalOver();
                prev = AuctionStatus.OPENING;
                diff--;
            }
            if(prev == AuctionStatus.OPENING) {
                emit AuctionEnded(winner, price);
                prev = AuctionStatus.ENDED;
                diff--;
            }
        }

    }

    /* ------------- Getters from now on ------------- */

}
