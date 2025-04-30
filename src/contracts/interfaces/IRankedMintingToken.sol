// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRankedMintingToken {
    function claimRank(uint256 term) external;
    function claimMintReward() external;
} 