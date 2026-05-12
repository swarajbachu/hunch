// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Pool-per-room prize pot for Hunch Live presentations.
/// Admin deposits MON, finalizes with a quadratic split among winners,
/// drips gas so burner wallets can self-claim, then winners pull their share.
contract HunchLivePool {
    struct Pool {
        address admin;
        uint256 deposited;
        uint256 distributed;
        bool finalized;
    }

    mapping(bytes32 => Pool) public pools;
    mapping(bytes32 => mapping(address => uint256)) public claimable;

    event PoolDeposited(string roomCode, address indexed admin, uint256 amount, uint256 newTotal);
    event PoolFinalized(string roomCode, uint256 totalDistributed, uint256 winnerCount);
    event Claimed(string roomCode, address indexed user, uint256 amount);

    function _key(string calldata roomCode) internal pure returns (bytes32) {
        return keccak256(bytes(roomCode));
    }

    function deposit(string calldata roomCode) external payable {
        require(msg.value > 0, "no value");
        bytes32 k = _key(roomCode);
        Pool storage p = pools[k];
        require(!p.finalized, "finalized");
        if (p.admin == address(0)) {
            p.admin = msg.sender;
        } else {
            require(p.admin == msg.sender, "not admin");
        }
        p.deposited += msg.value;
        emit PoolDeposited(roomCode, msg.sender, msg.value, p.deposited);
    }

    function finalize(
        string calldata roomCode,
        address[] calldata winners,
        uint256[] calldata amounts,
        uint256 gasDripPerWinner
    ) external {
        require(winners.length == amounts.length, "length mismatch");
        bytes32 k = _key(roomCode);
        Pool storage p = pools[k];
        require(p.admin == msg.sender, "not admin");
        require(!p.finalized, "already finalized");

        uint256 totalDrip = gasDripPerWinner * winners.length;
        uint256 totalAmounts;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmounts += amounts[i];
        }
        require(totalAmounts + totalDrip <= p.deposited, "exceeds pool");

        for (uint256 i = 0; i < winners.length; i++) {
            address w = winners[i];
            if (amounts[i] > 0) {
                claimable[k][w] += amounts[i];
            }
            if (gasDripPerWinner > 0) {
                (bool ok, ) = w.call{value: gasDripPerWinner}("");
                require(ok, "drip failed");
            }
        }

        p.distributed = totalAmounts;
        p.finalized = true;
        emit PoolFinalized(roomCode, totalAmounts, winners.length);
    }

    function claim(string calldata roomCode) external {
        bytes32 k = _key(roomCode);
        uint256 amount = claimable[k][msg.sender];
        require(amount > 0, "nothing to claim");
        claimable[k][msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
        emit Claimed(roomCode, msg.sender, amount);
    }

    function claimableOf(string calldata roomCode, address user) external view returns (uint256) {
        return claimable[_key(roomCode)][user];
    }

    function poolInfo(string calldata roomCode)
        external
        view
        returns (address admin, uint256 deposited, uint256 distributed, bool finalized)
    {
        Pool storage p = pools[_key(roomCode)];
        return (p.admin, p.deposited, p.distributed, p.finalized);
    }
}
