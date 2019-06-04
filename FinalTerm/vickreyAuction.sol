pragma solidity ^0.5.0;

contract VickreyAuction {

    uint public reservePrice;
    uint public commitmentDuration;
    uint public withdrawalDuration;
    uint public openingDuration;
    uint public depositRequirement;
    uint public activationTime;
    bool public ended;

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
        ended = false;
    }

}
