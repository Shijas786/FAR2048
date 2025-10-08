// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FAR2048Bet
 * @dev Smart contract for FAR2048 multiplayer 2048 betting game
 * @notice Handles match creation, player joins, escrow, and winner payouts
 * 
 * Game Flow:
 * 1. Host creates match with wager amount
 * 2. Up to 4 players join by depositing wager
 * 3. Game plays for 2 minutes
 * 4. Backend declares winner based on highest tile
 * 5. Winner automatically receives total pot (minus platform fee)
 */
contract FAR2048Bet is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Structs ============

    struct Match {
        uint256 id;
        address host;
        uint256 wagerAmount;        // Wager per player in USDC (with decimals)
        address usdcToken;          // USDC token address for this chain
        uint256 maxPlayers;         // Default: 4
        uint256 currentPlayers;     // Number of players who joined
        uint256 totalPot;           // Total USDC in escrow
        address winner;             // Address of winner (set after match ends)
        MatchStatus status;         // Current match state
        uint256 createdAt;          // Timestamp of creation
        uint256 startedAt;          // Timestamp when match started
        uint256 endedAt;            // Timestamp when match ended
        mapping(address => bool) players;  // Track if address joined
        address[] playerList;       // List of all players
    }

    enum MatchStatus {
        Open,       // Waiting for players
        InProgress, // Game is active
        Ended,      // Game finished, winner declared
        Cancelled   // Match cancelled (refunds issued)
    }

    // ============ State Variables ============

    uint256 public matchCounter;
    uint256 public platformFeePercent = 100; // 1% = 100 basis points (out of 10000)
    address public feeCollector;
    
    mapping(uint256 => Match) private matches;
    mapping(address => uint256[]) public userMatches; // Track matches per user

    // ============ Events ============

    event MatchCreated(
        uint256 indexed matchId,
        address indexed host,
        uint256 wagerAmount,
        address usdcToken,
        uint256 maxPlayers
    );

    event PlayerJoined(
        uint256 indexed matchId,
        address indexed player,
        uint256 playerCount
    );

    event MatchStarted(
        uint256 indexed matchId,
        uint256 startedAt,
        uint256 totalPlayers
    );

    event MatchEnded(
        uint256 indexed matchId,
        address indexed winner,
        uint256 winnings,
        uint256 platformFee
    );

    event MatchCancelled(
        uint256 indexed matchId,
        uint256 refundedAmount
    );

    event PlatformFeeUpdated(uint256 newFeePercent);

    // ============ Modifiers ============

    modifier matchExists(uint256 _matchId) {
        require(_matchId > 0 && _matchId <= matchCounter, "Match does not exist");
        _;
    }

    modifier onlyMatchHost(uint256 _matchId) {
        require(matches[_matchId].host == msg.sender, "Only match host");
        _;
    }

    // ============ Constructor ============

    constructor(address _feeCollector) Ownable(msg.sender) {
        require(_feeCollector != address(0), "Invalid fee collector");
        feeCollector = _feeCollector;
    }

    // ============ External Functions ============

    /**
     * @notice Create a new match with specified wager
     * @param _wagerAmount Amount of USDC each player must wager (with decimals, e.g., 1000000 = 1 USDC)
     * @param _usdcToken Address of USDC token on this chain
     * @param _maxPlayers Maximum players (default: 4)
     */
    function createMatch(
        uint256 _wagerAmount,
        address _usdcToken,
        uint256 _maxPlayers
    ) external nonReentrant returns (uint256) {
        require(_wagerAmount > 0, "Wager must be > 0");
        require(_usdcToken != address(0), "Invalid USDC token");
        require(_maxPlayers >= 2 && _maxPlayers <= 4, "Max players: 2-4");

        matchCounter++;
        uint256 matchId = matchCounter;

        Match storage newMatch = matches[matchId];
        newMatch.id = matchId;
        newMatch.host = msg.sender;
        newMatch.wagerAmount = _wagerAmount;
        newMatch.usdcToken = _usdcToken;
        newMatch.maxPlayers = _maxPlayers;
        newMatch.currentPlayers = 0;
        newMatch.totalPot = 0;
        newMatch.status = MatchStatus.Open;
        newMatch.createdAt = block.timestamp;

        emit MatchCreated(matchId, msg.sender, _wagerAmount, _usdcToken, _maxPlayers);

        // Host doesn't auto-join, they must call joinMatch separately
        return matchId;
    }

    /**
     * @notice Join an existing open match
     * @param _matchId ID of the match to join
     * @dev Requires prior USDC approval for wagerAmount
     */
    function joinMatch(uint256 _matchId) external nonReentrant matchExists(_matchId) {
        Match storage matchData = matches[_matchId];

        require(matchData.status == MatchStatus.Open, "Match not open");
        require(matchData.currentPlayers < matchData.maxPlayers, "Match full");
        require(!matchData.players[msg.sender], "Already joined");

        // Transfer USDC from player to contract (requires prior approval)
        IERC20 usdc = IERC20(matchData.usdcToken);
        usdc.safeTransferFrom(msg.sender, address(this), matchData.wagerAmount);

        // Add player to match
        matchData.players[msg.sender] = true;
        matchData.playerList.push(msg.sender);
        matchData.currentPlayers++;
        matchData.totalPot += matchData.wagerAmount;

        userMatches[msg.sender].push(_matchId);

        emit PlayerJoined(_matchId, msg.sender, matchData.currentPlayers);

        // Auto-start match if full
        if (matchData.currentPlayers == matchData.maxPlayers) {
            _startMatch(_matchId);
        }
    }

    /**
     * @notice Manually start a match (host only, requires at least 2 players)
     * @param _matchId ID of the match to start
     */
    function startMatch(uint256 _matchId) 
        external 
        matchExists(_matchId) 
        onlyMatchHost(_matchId) 
    {
        Match storage matchData = matches[_matchId];
        require(matchData.status == MatchStatus.Open, "Match not open");
        require(matchData.currentPlayers >= 2, "Need at least 2 players");

        _startMatch(_matchId);
    }

    /**
     * @notice Declare winner and distribute pot
     * @param _matchId ID of the match
     * @param _winner Address of the winning player
     * @dev Only callable by contract owner (backend oracle)
     */
    function declareWinner(uint256 _matchId, address _winner) 
        external 
        onlyOwner 
        nonReentrant 
        matchExists(_matchId) 
    {
        Match storage matchData = matches[_matchId];

        require(matchData.status == MatchStatus.InProgress, "Match not in progress");
        require(matchData.players[_winner], "Winner not in match");

        matchData.status = MatchStatus.Ended;
        matchData.winner = _winner;
        matchData.endedAt = block.timestamp;

        // Calculate platform fee
        uint256 platformFee = (matchData.totalPot * platformFeePercent) / 10000;
        uint256 winnings = matchData.totalPot - platformFee;

        // Transfer winnings to winner
        IERC20 usdc = IERC20(matchData.usdcToken);
        if (winnings > 0) {
            usdc.safeTransfer(_winner, winnings);
        }

        // Transfer platform fee to collector
        if (platformFee > 0) {
            usdc.safeTransfer(feeCollector, platformFee);
        }

        emit MatchEnded(_matchId, _winner, winnings, platformFee);
    }

    /**
     * @notice Cancel a match and refund all players
     * @param _matchId ID of the match to cancel
     * @dev Only callable by owner or host, only for Open/InProgress matches
     */
    function cancelMatch(uint256 _matchId) 
        external 
        nonReentrant 
        matchExists(_matchId) 
    {
        Match storage matchData = matches[_matchId];
        
        require(
            msg.sender == owner() || msg.sender == matchData.host,
            "Only owner or host"
        );
        require(
            matchData.status == MatchStatus.Open || matchData.status == MatchStatus.InProgress,
            "Match already ended"
        );

        matchData.status = MatchStatus.Cancelled;

        // Refund all players
        IERC20 usdc = IERC20(matchData.usdcToken);
        for (uint256 i = 0; i < matchData.playerList.length; i++) {
            address player = matchData.playerList[i];
            usdc.safeTransfer(player, matchData.wagerAmount);
        }

        emit MatchCancelled(_matchId, matchData.totalPot);
    }

    // ============ View Functions ============

    /**
     * @notice Get match details
     * @param _matchId ID of the match
     */
    function getMatch(uint256 _matchId) 
        external 
        view 
        matchExists(_matchId) 
        returns (
            uint256 id,
            address host,
            uint256 wagerAmount,
            address usdcToken,
            uint256 maxPlayers,
            uint256 currentPlayers,
            uint256 totalPot,
            address winner,
            MatchStatus status,
            uint256 createdAt,
            uint256 startedAt,
            uint256 endedAt
        ) 
    {
        Match storage matchData = matches[_matchId];
        return (
            matchData.id,
            matchData.host,
            matchData.wagerAmount,
            matchData.usdcToken,
            matchData.maxPlayers,
            matchData.currentPlayers,
            matchData.totalPot,
            matchData.winner,
            matchData.status,
            matchData.createdAt,
            matchData.startedAt,
            matchData.endedAt
        );
    }

    /**
     * @notice Get list of players in a match
     * @param _matchId ID of the match
     */
    function getMatchPlayers(uint256 _matchId) 
        external 
        view 
        matchExists(_matchId) 
        returns (address[] memory) 
    {
        return matches[_matchId].playerList;
    }

    /**
     * @notice Check if an address is a player in a match
     * @param _matchId ID of the match
     * @param _player Address to check
     */
    function isPlayerInMatch(uint256 _matchId, address _player) 
        external 
        view 
        matchExists(_matchId) 
        returns (bool) 
    {
        return matches[_matchId].players[_player];
    }

    /**
     * @notice Get all matches a user has participated in
     * @param _user Address of the user
     */
    function getUserMatches(address _user) external view returns (uint256[] memory) {
        return userMatches[_user];
    }

    // ============ Admin Functions ============

    /**
     * @notice Update platform fee percentage
     * @param _newFeePercent New fee in basis points (100 = 1%)
     */
    function setPlatformFee(uint256 _newFeePercent) external onlyOwner {
        require(_newFeePercent <= 500, "Max fee: 5%"); // Max 5%
        platformFeePercent = _newFeePercent;
        emit PlatformFeeUpdated(_newFeePercent);
    }

    /**
     * @notice Update fee collector address
     * @param _newCollector New fee collector address
     */
    function setFeeCollector(address _newCollector) external onlyOwner {
        require(_newCollector != address(0), "Invalid address");
        feeCollector = _newCollector;
    }

    // ============ Internal Functions ============

    function _startMatch(uint256 _matchId) internal {
        Match storage matchData = matches[_matchId];
        matchData.status = MatchStatus.InProgress;
        matchData.startedAt = block.timestamp;

        emit MatchStarted(_matchId, block.timestamp, matchData.currentPlayers);
    }
}

