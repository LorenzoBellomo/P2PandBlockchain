pragma solidity ^0.5.0;

// @author: Lorenzo Bellomo

contract Util {

    function getKeccak(uint nonce, uint amount) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(nonce, amount));
    }

}