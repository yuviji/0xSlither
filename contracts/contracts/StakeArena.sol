// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

/**
 * @title StakeArena
 * @dev Unified game contract with Pyth Entropy integration
 * Uses native ETH for staking on Base Mainnet
 */
contract StakeArena is IEntropyConsumer, Ownable, ReentrancyGuard {
    IEntropyV2 public entropy;
    address public entropyProvider;
    address public authorizedServer;

    // Match state
    struct MatchSummary {
        uint256 startTime;
        uint256 endTime;
        address winner;
        uint256 totalStaked;
        bool finalized;
    }

    // Event types for batched reporting
    enum EventType {
        EAT,
        DEATH
    }

    // Stat event structure for batched reporting
    struct StatEvent {
        EventType eventType;
        address player1;
        address player2;
        uint256 score;
    }

    // Position structure for spawn verification
    struct Position {
        uint256 x;
        uint256 y;
    }

    // Player state per match
    mapping(bytes32 => mapping(address => uint256)) public stakeBalance;
    mapping(bytes32 => mapping(address => bool)) public activeInMatch;
    
    // Match data
    mapping(bytes32 => MatchSummary) public matches;
    
    // Entropy management
    mapping(bytes32 => uint64) public entropyRequestIdByMatch; // matchId => Pyth sequence number
    mapping(bytes32 => bytes32) public entropySeedByMatch; // matchId => revealed seed
    mapping(uint64 => bytes32) private sequenceToMatchId; // for callback routing
    mapping(bytes32 => address[]) private matchPlayers; // for spawn verification
    
    // Leaderboard
    mapping(address => uint256) public bestScore;
    
    struct LeaderboardEntry {
        address player;
        uint256 score;
    }
    
    LeaderboardEntry[] public leaderboard;
    uint256 public constant MAX_LEADERBOARD_SIZE = 10;

    // Constants for spawn verification (match TypeScript game logic)
    uint256 public constant WORLD_WIDTH = 5000;
    uint256 public constant WORLD_HEIGHT = 5000;
    uint256 public constant MIN_SPAWN_DISTANCE = 200;

    // Events
    event DepositedToVault(address indexed player, uint256 amount, uint256 timestamp);
    event Entered(bytes32 indexed matchId, address indexed player, uint256 amount);
    event EatReported(
        bytes32 indexed matchId,
        address indexed eater,
        address indexed eaten,
        uint256 timestamp
    );
    event EatLoot(
        bytes32 indexed matchId,
        address indexed eater,
        address indexed eaten,
        uint256 amountTransferred,
        uint256 timestamp
    );
    event TappedOut(bytes32 indexed matchId, address indexed player, uint256 amountWithdrawn);
    event SelfDeathReported(bytes32 indexed matchId, address indexed player, uint256 score, uint256 timestamp);
    event SelfDeath(bytes32 indexed matchId, address indexed player, uint256 amountToServer, uint256 timestamp);
    event MatchFinalized(bytes32 indexed matchId, address indexed winner, uint256 timestamp);
    event BestScoreUpdated(address indexed player, uint256 newScore);
    event AuthorizedServerUpdated(address indexed newServer);
    event BatchStatsReported(bytes32 indexed matchId, uint256 eventCount, uint256 timestamp);
    event EntropyRequested(bytes32 indexed matchId, uint64 requestId);
    event EntropyStored(bytes32 indexed matchId, bytes32 seed);
    event PlayerJoined(bytes32 indexed matchId, address indexed player);

    error InsufficientFee();
    error OnlyAuthorizedServer();
    error EntropyAlreadyRequested();
    error InvalidMatchId();

    modifier onlyAuthorizedServer() {
        if (msg.sender != authorizedServer) revert OnlyAuthorizedServer();
        _;
    }

    /**
     * @dev Constructor
     * @param _authorizedServer Address of the game server wallet
     * @param _entropy Address of Pyth Entropy contract on Base
     */
    constructor(
        address _authorizedServer,
        address _entropy
    ) Ownable(msg.sender) {
        require(_authorizedServer != address(0), "Invalid server address");
        require(_entropy != address(0), "Invalid entropy address");
        
        authorizedServer = _authorizedServer;
        entropy = IEntropyV2(_entropy);
        entropyProvider = entropy.getDefaultProvider();
    }

    /**
     * @dev Player deposits native ETH to server vault for continuous gameplay
     * This replaces the per-match enterMatch flow for continuous matches
     */
    function depositToVault() external payable nonReentrant {
        require(msg.value > 0, "Amount must be > 0");
        
        // Transfer directly to server wallet (vault)
        (bool success, ) = payable(authorizedServer).call{value: msg.value}("");
        require(success, "Transfer to vault failed");
        
        emit DepositedToVault(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @dev Request entropy for a match from Pyth
     * @param matchId Unique match identifier
     */
    function requestMatchEntropy(bytes32 matchId) external payable onlyAuthorizedServer {
        if (matchId == bytes32(0)) revert InvalidMatchId();
        if (entropyRequestIdByMatch[matchId] != 0) revert EntropyAlreadyRequested();

        // Get the fee required by Pyth Entropy
        uint256 fee = entropy.getFeeV2();
        if (msg.value < fee) revert InsufficientFee();

        // Request random number from Pyth Entropy
        uint64 sequenceNumber = entropy.requestV2{value: fee}();

        // Store mappings for callback routing
        entropyRequestIdByMatch[matchId] = sequenceNumber;
        sequenceToMatchId[sequenceNumber] = matchId;

        // Initialize match
        if (matches[matchId].startTime == 0) {
            matches[matchId].startTime = block.timestamp;
        }

        emit EntropyRequested(matchId, sequenceNumber);

        // Refund excess payment
        if (msg.value > fee) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - fee}("");
            require(success, "Refund failed");
        }
    }

    /**
     * @dev Callback function called by Pyth Entropy contract
     * This is called automatically when the random number is revealed
     * @param sequenceNumber The sequence number of the request
     * @param randomNumber The revealed random number
     */
    function entropyCallback(
        uint64 sequenceNumber,
        address, // provider (unused)
        bytes32 randomNumber
    ) internal override {
        bytes32 matchId = sequenceToMatchId[sequenceNumber];
        require(matchId != bytes32(0), "Unknown sequence number");

        // Store the revealed seed
        entropySeedByMatch[matchId] = randomNumber;

        emit EntropyStored(matchId, randomNumber);
    }

    /**
     * @dev Get the entropy contract address (required by IEntropyConsumer)
     */
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    /**
     * @dev Get the revealed seed for a match
     * @param matchId Match identifier
     * @return seed The revealed random seed (bytes32(0) if not yet available)
     */
    function getMatchSeed(bytes32 matchId) external view returns (bytes32) {
        return entropySeedByMatch[matchId];
    }

    /**
     * @dev Check if entropy has been requested for a match
     * @param matchId Match identifier
     * @return True if entropy has been requested
     */
    function hasRequestedEntropy(bytes32 matchId) external view returns (bool) {
        return entropyRequestIdByMatch[matchId] != 0;
    }

    /**
     * @dev Check if entropy seed is available for a match
     * @param matchId Match identifier
     * @return True if seed is available
     */
    function isSeedAvailable(bytes32 matchId) external view returns (bool) {
        return entropySeedByMatch[matchId] != bytes32(0);
    }

    /**
     * @dev Get the current Entropy fee
     * @return Fee in wei
     */
    function getEntropyFee() external view returns (uint256) {
        return entropy.getFeeV2();
    }

    /**
     * @dev Register player joining match (for spawn verification)
     * @param matchId Match identifier
     * @param player Player address
     */
    function registerPlayerJoin(bytes32 matchId, address player) external onlyAuthorizedServer {
        matchPlayers[matchId].push(player);
        emit PlayerJoined(matchId, player);
    }

    /**
     * @dev Get players who joined a match
     * @param matchId Match identifier
     * @return Array of player addresses
     */
    function getMatchPlayers(bytes32 matchId) external view returns (address[] memory) {
        return matchPlayers[matchId];
    }

    /**
     * @dev Verify spawn position was generated correctly from seed
     * @param matchId Match identifier
     * @param player Player address
     * @param claimedX Claimed X position
     * @param claimedY Claimed Y position
     * @return True if spawn position is valid
     */
    function verifySpawnPosition(
        bytes32 matchId,
        address player,
        uint256 claimedX,
        uint256 claimedY
    ) external view returns (bool) {
        bytes32 seed = entropySeedByMatch[matchId];
        if (seed == bytes32(0)) return false;

        address[] memory players = matchPlayers[matchId];
        
        // Find player index
        uint256 playerIndex = type(uint256).max;
        for (uint256 i = 0; i < players.length; i++) {
            if (players[i] == player) {
                playerIndex = i;
                break;
            }
        }
        
        if (playerIndex == type(uint256).max) return false;

        // Deterministically compute spawn position from seed
        (uint256 actualX, uint256 actualY) = _computeSpawnPosition(seed, playerIndex);

        return (claimedX == actualX && claimedY == actualY);
    }

    /**
     * @dev Verify initial pellet positions
     * @param matchId Match identifier
     * @param pelletCount Number of pellets
     * @return positions Array of pellet positions
     */
    function verifyPelletPositions(
        bytes32 matchId,
        uint256 pelletCount
    ) external view returns (Position[] memory positions) {
        bytes32 seed = entropySeedByMatch[matchId];
        require(seed != bytes32(0), "Seed not available");

        positions = new Position[](pelletCount);
        
        for (uint256 i = 0; i < pelletCount; i++) {
            // Derive pellet-specific seed
            bytes32 pelletSeed = keccak256(abi.encodePacked(seed, "pellet", i));
            positions[i] = Position({
                x: uint256(pelletSeed) % WORLD_WIDTH,
                y: uint256(keccak256(abi.encodePacked(pelletSeed, "y"))) % WORLD_HEIGHT
            });
        }

        return positions;
    }

    /**
     * @dev Internal function to compute spawn position
     * @param seed Entropy seed
     * @param playerIndex Player index in match
     * @return x X coordinate
     * @return y Y coordinate
     */
    function _computeSpawnPosition(bytes32 seed, uint256 playerIndex) 
        internal 
        pure 
        returns (uint256 x, uint256 y) 
    {
        // Generate deterministic spawn from seed and player index
        bytes32 playerSeed = keccak256(abi.encodePacked(seed, playerIndex));
        
        x = uint256(playerSeed) % WORLD_WIDTH;
        y = uint256(keccak256(abi.encodePacked(playerSeed, "y"))) % WORLD_HEIGHT;
    }

    /**
     * @dev Server reports batched game statistics
     * @param matchId Match identifier
     * @param events Array of stat events (eats and deaths)
     */
    function reportBatchedStats(
        bytes32 matchId,
        StatEvent[] calldata events
    ) external onlyAuthorizedServer {
        require(events.length > 0, "No events");
        require(events.length <= 100, "Too many events"); // Gas limit protection

        for (uint256 i = 0; i < events.length; i++) {
            StatEvent calldata evt = events[i];

            if (evt.eventType == EventType.EAT) {
                require(evt.player1 != evt.player2, "Cannot eat self");
                emit EatReported(matchId, evt.player1, evt.player2, block.timestamp);
            } else if (evt.eventType == EventType.DEATH) {
                // Update best score if higher
                if (evt.score > bestScore[evt.player1]) {
                    bestScore[evt.player1] = evt.score;
                    _updateLeaderboard(evt.player1, evt.score);
                    emit BestScoreUpdated(evt.player1, evt.score);
                }
                emit SelfDeathReported(matchId, evt.player1, evt.score, block.timestamp);
            }
        }

        emit BatchStatsReported(matchId, events.length, block.timestamp);
    }

    /**
     * @dev Server reports that one player ate another (individual, for immediate updates)
     * @param matchId Match identifier
     * @param eater Address of the player who ate
     * @param eaten Address of the player who was eaten
     */
    function reportEat(
        bytes32 matchId,
        address eater,
        address eaten
    ) external onlyAuthorizedServer {
        require(eater != eaten, "Cannot eat self");
        emit EatReported(matchId, eater, eaten, block.timestamp);
    }

    /**
     * @dev Server reports that a player died (individual, for immediate updates)
     * @param matchId Match identifier
     * @param player Address of the player who died
     * @param score Player's final score
     */
    function reportSelfDeath(
        bytes32 matchId,
        address player,
        uint256 score
    ) external onlyAuthorizedServer {
        // Update best score if this score is higher
        if (score > bestScore[player]) {
            bestScore[player] = score;
            _updateLeaderboard(player, score);
            emit BestScoreUpdated(player, score);
        }

        emit SelfDeathReported(matchId, player, score, block.timestamp);
    }

    /**
     * @dev Player stakes native ETH to enter a match
     * @param matchId Unique match identifier
     * @notice DEPRECATED: Use depositToVault() for continuous matches
     */
    function enterMatch(bytes32 matchId) external payable nonReentrant {
        require(msg.value > 0, "Amount must be > 0");
        require(!activeInMatch[matchId][msg.sender], "Already in match");
        require(!matches[matchId].finalized, "Match already finalized");

        stakeBalance[matchId][msg.sender] = msg.value;
        activeInMatch[matchId][msg.sender] = true;
        
        // Initialize match if first entry
        if (matches[matchId].startTime == 0) {
            matches[matchId].startTime = block.timestamp;
        }
        matches[matchId].totalStaked += msg.value;

        emit Entered(matchId, msg.sender, msg.value);
    }

    /**
     * @dev Legacy function for match-based gameplay with on-chain stake transfers
     * @notice DEPRECATED: Use reportEat() for continuous matches (vault mode)
     */
    function reportEatWithTransfer(
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
     * @dev Legacy function for match-based gameplay with on-chain stake transfers
     * @notice DEPRECATED: Use reportSelfDeath() for continuous matches (vault mode)
     */
    function reportSelfDeathWithTransfer(
        bytes32 matchId,
        address player,
        uint256 score
    ) external onlyAuthorizedServer nonReentrant {
        require(activeInMatch[matchId][player], "Player not active");

        uint256 stakeAmount = stakeBalance[matchId][player];
        require(stakeAmount > 0, "No stake to collect");

        // Transfer player's stake to server wallet
        stakeBalance[matchId][player] = 0;
        activeInMatch[matchId][player] = false;

        // Update best score if this score is higher
        if (score > bestScore[player]) {
            bestScore[player] = score;
            _updateLeaderboard(player, score);
            emit BestScoreUpdated(player, score);
        }

        // Send ETH to server wallet
        (bool success, ) = payable(authorizedServer).call{value: stakeAmount}("");
        require(success, "Transfer to server failed");

        emit SelfDeath(matchId, player, stakeAmount, block.timestamp);
    }

    /**
     * @dev Player voluntarily exits match and withdraws stake
     * @param matchId Match identifier
     * @param score Player's final score in the match
     * @notice DEPRECATED: In vault mode, server handles payouts via direct transfers
     */
    function tapOut(bytes32 matchId, uint256 score) external nonReentrant {
        require(activeInMatch[matchId][msg.sender], "Not active in match");
        require(!matches[matchId].finalized, "Match finalized");

        uint256 withdrawAmount = stakeBalance[matchId][msg.sender];
        require(withdrawAmount > 0, "No stake to withdraw");

        stakeBalance[matchId][msg.sender] = 0;
        activeInMatch[matchId][msg.sender] = false;

        // Update best score if this score is higher
        if (score > bestScore[msg.sender]) {
            bestScore[msg.sender] = score;
            _updateLeaderboard(msg.sender, score);
            emit BestScoreUpdated(msg.sender, score);
        }

        // Send ETH back to player
        (bool success, ) = payable(msg.sender).call{value: withdrawAmount}("");
        require(success, "Transfer failed");

        emit TappedOut(matchId, msg.sender, withdrawAmount);
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
                (bool success, ) = payable(player).call{value: remainingStake}("");
                require(success, "Transfer failed");
            }

            activeInMatch[matchId][player] = false;
        }

        emit MatchFinalized(matchId, winner, block.timestamp);
    }

    /**
     * @dev Allow contract to receive ETH
     */
    receive() external payable {}

    /**
     * @dev Withdraw contract balance to owner
     * Allows owner to withdraw accumulated ETH from self-deaths and other sources
     */
    function withdrawBalance() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Transfer failed");
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
