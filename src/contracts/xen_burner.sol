// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

interface IBurnableToken {
    function burn(address user, uint256 amount) external;
}

interface IUniswapV2Router02 {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function factory() external pure returns (address);

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);

    function getAmountsOut(uint amountIn, address[] memory path) external view returns (uint[] memory amounts);
}

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IBurnRedeemable is IERC165 {
    function onTokenBurned(address user, uint256 amount) external;
}

interface IUniswapV2PairExtended is IUniswapV2Pair {
    function token0() external view returns (address);
    function token1() external view returns (address);
}

contract XenBurner is ERC20, ReentrancyGuard, Ownable, IBurnRedeemable {
    using SafeERC20 for IERC20;

    uint256 public constant XEN_TO_XBURN_RATE = 10_000;  // 10k XEN = 1 XBURN
    uint256 public constant SWAP_THRESHOLD = 100_000 * 1e18;  // Trigger swap at 100k XEN
    uint256 public constant MAX_DEADLINE = 15 minutes;
    uint256 public constant CALLER_REWARD_PERCENTAGE = 5;
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10**18;
    uint256 public constant MINIMUM_LIQUIDITY = 100_000 * 1e18;

    address public immutable xenToken;
    address public immutable uniswapRouter;
    uint256 public pendingXen;  // XEN waiting to be swapped
    uint256 public totalXenBurned;
    uint256 public totalXburnBurned;
    mapping(address => uint256) public userXenBurns;
    mapping(address => uint256) public userXburnBurns;
    bool public initialized;
    address public liquidityPair;

    // Events for critical operations
    event XenBurned(address indexed user, uint256 amount, uint256 rewards);
    event XburnBurned(address indexed caller, uint256 amount);
    event SwapFailed(string reason, uint256 xenAmount);
    event CallerRewarded(address indexed caller, uint256 amount);
    event LiquidityInitialized(uint256 xburnAmount, uint256 xenAmount, uint256 liquidity);
    event XburnSwapped(address indexed caller, uint256 xenSwapped, uint256 xburnReceived);

    // Add at the top of contract, after interface declarations
    error NotInitialized();
    error AlreadyInitialized();
    error ZeroAmount();
    error InsufficientLiquidity();
    error InsufficientBalance();
    error Unauthorized();
    error ZeroAddress();
    error PairNotSet();
    error PendingXenTooLow();
    error InsufficientOutput();
    error InvalidPairTokens();
    error LiquidityInitFailed();

    constructor() ERC20("XBURN", "XBURN") Ownable(msg.sender) {
        xenToken = 0xcAe27BE52c003953f0B050ab6a31E5d5F0d52ccB;      // Sepolia XEN
        uniswapRouter = 0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3;  // Sepolia Uniswap Router
    }

    function initializeLiquidity(uint256 xenAmount) external onlyOwner {
        if (initialized) revert AlreadyInitialized();
        if (xenAmount == 0) revert ZeroAmount();
        if (xenAmount < MINIMUM_LIQUIDITY) revert InsufficientLiquidity();
        if (IERC20(xenToken).balanceOf(msg.sender) < xenAmount) revert InsufficientBalance();

        uint256 initialMintAmount = INITIAL_SUPPLY;
        _mint(address(this), initialMintAmount);

        IERC20(xenToken).safeTransferFrom(msg.sender, address(this), xenAmount);

        _approve(address(this), address(uniswapRouter), initialMintAmount);
        IERC20(xenToken).safeIncreaseAllowance(uniswapRouter, xenAmount);

        try
            IUniswapV2Router02(uniswapRouter).addLiquidity(
                address(this),
                xenToken,
                initialMintAmount,
                xenAmount,
                (initialMintAmount * 95) / 100,
                (xenAmount * 95) / 100,
                msg.sender,
                block.timestamp + MAX_DEADLINE
            )
        returns (uint256 xburnUsed, uint256 xenUsed, uint256 liquidity) {
            if (liquidity == 0) revert InsufficientLiquidity();
            initialized = true;
            liquidityPair = IUniswapV2Factory(IUniswapV2Router02(uniswapRouter).factory())
                .getPair(address(this), xenToken);
            if (liquidityPair == address(0)) revert PairNotSet();

            address token0 = IUniswapV2PairExtended(liquidityPair).token0();
            address token1 = IUniswapV2PairExtended(liquidityPair).token1();
            if (!((token0 == address(this) && token1 == xenToken) ||
                 (token0 == xenToken && token1 == address(this)))) {
                revert InvalidPairTokens();
            }

            emit LiquidityInitialized(xburnUsed, xenUsed, liquidity);
        } catch Error(string memory reason) {
            revert(string(abi.encodePacked("XenBurner: ", reason)));
        } catch {
            revert("XenBurner: Liquidity initialization failed");
        }
    }

    /// @notice Burns XEN tokens with 80/20 split (80% direct burn, 20% accumulated)
    /// @param amount Amount of XEN to burn
    function burnXen(uint256 amount) external nonReentrant {
        require(amount > 0, "Zero amount");
        
        // Transfer XEN to this contract first
        IERC20(xenToken).safeTransferFrom(msg.sender, address(this), amount);
        
        // Split and process
        uint256 xenForAccumulation = amount * 20 / 100;
        uint256 xenForBurn = amount - xenForAccumulation;
        
        pendingXen += xenForAccumulation;
        IBurnableToken(xenToken).burn(address(this), xenForBurn); // Burn from contract balance
        
        totalXenBurned += amount;
        userXenBurns[msg.sender] += amount;
        
        emit XenBurned(msg.sender, amount, xenForBurn);
    }

    /// @notice Callback from XEN contract when tokens are burned
    /// @param user Address that burned XEN
    /// @param amount Amount of XEN burned
    function onTokenBurned(address user, uint256 amount) external override {
        if (msg.sender != xenToken) revert Unauthorized();
        if (user == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        uint256 rewards = amount / XEN_TO_XBURN_RATE;  // 10k XEN = 1 XBURN
        _mint(user, rewards);
        
        totalXenBurned += amount;
        userXenBurns[user] += amount;

        emit XenBurned(user, amount, rewards);
    }

    /// @notice Swaps accumulated XEN for XBURN when threshold is reached
    /// @param minXburnReceived Minimum amount of XBURN to receive from swap
    function swapXenForXburn(uint256 minXburnReceived) external nonReentrant {
        require(pendingXen >= SWAP_THRESHOLD, "Threshold not reached");
        if (!initialized) revert NotInitialized();
        if (liquidityPair == address(0)) revert PairNotSet();

        uint256 xenToSwap = pendingXen;
        pendingXen = 0; // Reset accumulator

        // Calculate and send caller reward
        uint256 callerReward = (xenToSwap * CALLER_REWARD_PERCENTAGE) / 100;
        uint256 xenForSwap = xenToSwap - callerReward;
        IERC20(xenToken).safeTransfer(msg.sender, callerReward);
        emit CallerRewarded(msg.sender, callerReward);

        // Setup swap path
        address[] memory path = new address[](2);
        path[0] = xenToken;
        path[1] = address(this);

        // Approve router and execute swap
        IERC20(xenToken).safeIncreaseAllowance(uniswapRouter, xenForSwap);

        try IUniswapV2Router02(uniswapRouter).swapExactTokensForTokens(
            xenForSwap,
            minXburnReceived,
            path,
            msg.sender,    // Send to msg.sender first
            block.timestamp + MAX_DEADLINE
        ) returns (uint256[] memory amounts) {
            uint256 xburnReceived = amounts[1];
            if (xburnReceived < minXburnReceived) revert InsufficientOutput();

            // Force transfer back to contract and burn
            _transfer(msg.sender, address(this), xburnReceived);
            _burn(address(this), xburnReceived);
            totalXburnBurned += xburnReceived;

            emit XburnSwapped(msg.sender, xenForSwap, xburnReceived);
            emit XburnBurned(address(this), xburnReceived);
        } catch Error(string memory reason) {
            pendingXen = xenToSwap;
            emit SwapFailed(reason, xenToSwap);
            revert(string(abi.encodePacked("Swap failed: ", reason)));
        } catch {
            pendingXen = xenToSwap;
            emit SwapFailed("Unknown error", xenToSwap);
            revert("Swap failed: Unknown error");
        }
    }

    function burnXburn(uint256 amountToBurn) external nonReentrant {
        if (amountToBurn == 0) revert ZeroAmount();
        if (balanceOf(msg.sender) < amountToBurn) revert InsufficientBalance();

        _burn(msg.sender, amountToBurn);
        totalXburnBurned += amountToBurn;
        userXburnBurns[msg.sender] += amountToBurn;

        emit XburnBurned(msg.sender, amountToBurn);
    }

    function renounceOwnership() public override onlyOwner {
        super.renounceOwnership();
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IBurnRedeemable).interfaceId;
    }

    function getStats(address user) external view returns (
        uint256 userXenBurned,
        uint256 userXburnBurned,
        uint256 userXburnBalance,
        uint256 userBurnPercentage,
        uint256 globalXenBurned,
        uint256 globalXburnBurned,
        uint256 totalXburnSupply,
        uint256 globalBurnPercentage
    ) {
        uint256 supply = totalSupply();
        
        // Calculate percentages with 2 decimal precision
        userBurnPercentage = totalXenBurned > 0 ? (userXenBurns[user] * 10000) / totalXenBurned : 0;
        globalBurnPercentage = supply > 0 ? (totalXburnBurned * 10000) / supply : 0;
        
        return (
            userXenBurns[user],
            userXburnBurns[user],
            balanceOf(user),
            userBurnPercentage,
            totalXenBurned,
            totalXburnBurned,
            supply,
            globalBurnPercentage
        );
    }

    // Add back key analytics function
    function getAccumulationProgress() external view returns (
        uint256 accumulated,
        uint256 threshold,
        uint256 percentage
    ) {
        accumulated = pendingXen;
        threshold = SWAP_THRESHOLD;
        percentage = (accumulated * 10000) / threshold;
        return (accumulated, threshold, percentage);
    }
}
