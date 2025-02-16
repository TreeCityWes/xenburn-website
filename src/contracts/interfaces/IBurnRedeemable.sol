// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBurnRedeemable {
    function onTokenBurned(address user, uint256 amount) external;
} 