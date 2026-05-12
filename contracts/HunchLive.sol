// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Lightweight event log for Hunch Live question resolutions.
/// Off-chain Convex remains source of truth for points & votes; this contract
/// gives every resolution a verifiable onchain footprint on Monad.
contract HunchLive {
    event QuestionResolved(
        string roomCode,
        string questionId,
        bool outcome,
        uint256 yesCount,
        uint256 noCount,
        address indexed resolver,
        uint256 timestamp
    );

    function recordResolve(
        string calldata roomCode,
        string calldata questionId,
        bool outcome,
        uint256 yesCount,
        uint256 noCount
    ) external {
        emit QuestionResolved(
            roomCode,
            questionId,
            outcome,
            yesCount,
            noCount,
            msg.sender,
            block.timestamp
        );
    }
}
