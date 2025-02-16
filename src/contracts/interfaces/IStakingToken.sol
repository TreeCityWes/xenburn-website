// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IStakingToken {
    function stake(uint256 amount, uint256 term) external;
    function withdraw() external;
} 