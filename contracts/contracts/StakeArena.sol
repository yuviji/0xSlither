// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StakeArena
 * @dev Main game contract handling stakes, loot transfers, and leaderboards
 */
contract StakeArena is Ownable, ReentrancyGuard {
    IERC20 public immutable gameToken;
    address public authorizedServer;

    // Match state
    struct MatchSummary {
        uint256 startTime;
        uint256 endTime;
        address winner;
        uint256 totalStaked;
        bool finalized;
    }

    // Player state per match
    mapping(bytes32 => mapping(address => uint256)) public stakeBalance;
    mapping(bytes32 => mapping(address => bool)) public activeInMatch;
    
    // Match data
    mapping(bytes32 => MatchSummary) public matches;
    mapping(bytes32 => bytes32) public matchEntropyCommit;
    
    // Leaderboard
    mapping(address => uint256) public bestScore;
    
    struct LeaderboardEntry {
        address player;
        uint256 score;
    }
    
    LeaderboardEntry[] public leaderboard;
    uint256 public constant MAX_LEADERBOARD_SIZE = 10;

    // Events
    event Entered(bytes32 indexed matchId, address indexed player, uint256 amount);
    event EatLoot(
        bytes32 indexed matchId,
        address indexed eater,
        address indexed eaten,
        uint256 amountTransferred,
        uint256 timestamp
    );
    event TappedOut(bytes32 indexed matchId, address indexed player, uint256 amountWithdrawn);
    event EntropyCommitted(bytes32 indexed matchId, bytes32 entropyRequestId);
    event MatchFinalized(bytes32 indexed matchId, address indexed winner, uint256 timestamp);
    event BestScoreUpdated(address indexed player, uint256 newScore);
    event AuthorizedServerUpdated(address indexed newServer);

    modifier onlyAuthorizedServer() {
        require(msg.sender == authorizedServer, "Only authorized server");
        _;
    }

    constructor(address _gameToken, address _authorizedServer) Ownable(msg.sender) {
        require(_gameToken != address(0), "Invalid token address");
        require(_authorizedServer != address(0), "Invalid server address");
        gameToken = IERC20(_gameToken);
        authorizedServer = _authorizedServer;
    }

    /**
     * @dev Player stakes tokens to enter a match
     * @param matchId Unique match identifier
     * @param amount Amount of tokens to stake
     */
    function enterMatch(bytes32 matchId, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(!activeInMatch[matchId][msg.sender], "Already in match");
        require(!matches[matchId].finalized, "Match already finalized");

        // Transfer tokens from player to contract
        require(
            gameToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        stakeBalance[matchId][msg.sender] = amount;
        activeInMatch[matchId][msg.sender] = true;
        
        // Initialize match if first entry
        if (matches[matchId].startTime == 0) {
            matches[matchId].startTime = block.timestamp;
        }
        matches[matchId].totalStaked += amount;

        emit Entered(matchId, msg.sender, amount);
    }

    /**
     * @dev Server reports that one player ate another
     * @param matchId Match identifier
     * @param eater Address of the player who ate
     * @param eaten Address of the player who was eaten
     */
    function reportEat(
        bytes32 matchId,
        address eater,
        address eaten
    ) external onlyAuthorizedServer nonReentrant {
        require(activeInMatch[matchId][eater], "Eater not active");
        require(activeInMatch[matchId][eaten], "Eaten not active");
        require(eater != eaten, "Cannot eat self");

        uint256 lootAmount = stakeBalance[matchId][eaten];
        require(lootAmount > 0, "No stake to loot");

        // Transfer 100% of eaten player's stake to eater
        stakeBalance[matchId][eaten] = 0;
        stakeBalance[matchId][eater] += lootAmount;
        activeInMatch[matchId][eaten] = false;

        emit EatLoot(matchId, eater, eaten, lootAmount, block.timestamp);
    }

    /**
     * @dev Player voluntarily exits match and withdraws stake
     * @param matchId Match identifier
     */
    function tapOut(bytes32 matchId) external nonReentrant {
        require(activeInMatch[matchId][msg.sender], "Not active in match");
        require(!matches[matchId].finalized, "Match finalized");

        uint256 withdrawAmount = stakeBalance[matchId][msg.sender];
        require(withdrawAmount > 0, "No stake to withdraw");

        stakeBalance[matchId][msg.sender] = 0;
        activeInMatch[matchId][msg.sender] = false;

        require(
            gameToken.transfer(msg.sender, withdrawAmount),
            "Transfer failed"
        );

        emit TappedOut(matchId, msg.sender, withdrawAmount);
    }

    /**
     * @dev Server commits entropy seed for match (placeholder for Pyth integration)
     * @param matchId Match identifier
     * @param entropyRequestId Entropy request identifier
     */
    function commitEntropy(bytes32 matchId, bytes32 entropyRequestId) 
        external 
        onlyAuthorizedServer 
    {
        require(matches[matchId].startTime > 0, "Match not started");
        require(!matches[matchId].finalized, "Match finalized");
        
        matchEntropyCommit[matchId] = entropyRequestId;
        emit EntropyCommitted(matchId, entropyRequestId);
    }

    /**
     * @dev Finalize match and update leaderboard
     * @param matchId Match identifier
     * @param players Array of player addresses
     * @param scores Array of final scores (must match players length)
     * @param winner Address of the winner
     */
    function finalizeMatch(
        bytes32 matchId,
        address[] calldata players,
        uint256[] calldata scores,
        address winner
    ) external onlyAuthorizedServer nonReentrant {
        require(!matches[matchId].finalized, "Already finalized");
        require(players.length == scores.length, "Array length mismatch");
        require(players.length > 0, "No players");

        matches[matchId].finalized = true;
        matches[matchId].endTime = block.timestamp;
        matches[matchId].winner = winner;

        // Update best scores and distribute remaining stakes
        for (uint256 i = 0; i < players.length; i++) {
            address player = players[i];
            uint256 score = scores[i];

            // Update best score
            if (score > bestScore[player]) {
                bestScore[player] = score;
                _updateLeaderboard(player, score);
                emit BestScoreUpdated(player, score);
            }

            // Return remaining stake to player
            uint256 remainingStake = stakeBalance[matchId][player];
            if (remainingStake > 0) {
                stakeBalance[matchId][player] = 0;
                require(
                    gameToken.transfer(player, remainingStake),
                    "Transfer failed"
                );
            }

            activeInMatch[matchId][player] = false;
        }

        emit MatchFinalized(matchId, winner, block.timestamp);
    }

    /**
     * @dev Internal function to update leaderboard
     * @param player Player address
     * @param score New score
     */
    function _updateLeaderboard(address player, uint256 score) internal {
        // Check if player already on leaderboard
        int256 existingIndex = -1;
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i].player == player) {
                existingIndex = int256(i);
                break;
            }
        }

        // Remove old entry if exists
        if (existingIndex >= 0) {
            for (uint256 i = uint256(existingIndex); i < leaderboard.length - 1; i++) {
                leaderboard[i] = leaderboard[i + 1];
            }
            leaderboard.pop();
        }

        // Find insertion position
        uint256 insertPos = leaderboard.length;
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (score > leaderboard[i].score) {
                insertPos = i;
                break;
            }
        }

        // Only insert if in top MAX_LEADERBOARD_SIZE or leaderboard not full
        if (insertPos < MAX_LEADERBOARD_SIZE || leaderboard.length < MAX_LEADERBOARD_SIZE) {
            // Insert new entry
            leaderboard.push(LeaderboardEntry(address(0), 0));
            for (uint256 i = leaderboard.length - 1; i > insertPos; i--) {
                leaderboard[i] = leaderboard[i - 1];
            }
            leaderboard[insertPos] = LeaderboardEntry(player, score);

            // Trim to MAX_LEADERBOARD_SIZE
            while (leaderboard.length > MAX_LEADERBOARD_SIZE) {
                leaderboard.pop();
            }
        }
    }

    /**
     * @dev Update authorized server address
     * @param newServer New server address
     */
    function updateAuthorizedServer(address newServer) external onlyOwner {
        require(newServer != address(0), "Invalid address");
        authorizedServer = newServer;
        emit AuthorizedServerUpdated(newServer);
    }

    /**
     * @dev Get full leaderboard
     * @return Array of leaderboard entries
     */
    function getLeaderboard() external view returns (LeaderboardEntry[] memory) {
        return leaderboard;
    }

    /**
     * @dev Get leaderboard size
     * @return Current number of entries
     */
    function getLeaderboardSize() external view returns (uint256) {
        return leaderboard.length;
    }

    /**
     * @dev Get player's stake in a match
     * @param matchId Match identifier
     * @param player Player address
     * @return Current stake amount
     */
    function getStake(bytes32 matchId, address player) external view returns (uint256) {
        return stakeBalance[matchId][player];
    }

    /**
     * @dev Check if player is active in match
     * @param matchId Match identifier
     * @param player Player address
     * @return True if active
     */
    function isActive(bytes32 matchId, address player) external view returns (bool) {
        return activeInMatch[matchId][player];
    }

    /**
     * @dev Get match summary
     * @param matchId Match identifier
     * @return Match summary struct
     */
    function getMatchSummary(bytes32 matchId) external view returns (MatchSummary memory) {
        return matches[matchId];
    }
}

