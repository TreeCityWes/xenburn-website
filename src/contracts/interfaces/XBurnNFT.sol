// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title XBurnNFT
 * @dev ERC721 contract representing locked XBURN positions.
 * Each NFT represents a position where XEN tokens were burned in exchange for XBURN rewards.
 * The NFT contains all the details of the burn and matures after a set time period.
 * Implements EIP-2981 for royalties and OpenSea contract metadata.
 */

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

import "./SVGGenerator.sol";

using Strings for uint256;

contract XBurnNFT is ERC721, ERC721Enumerable, ERC2981, Ownable {
    // ------------------------------------------------
    // ================ Constants =====================
    // ------------------------------------------------
    
    uint256 public constant MAX_TERM_DAYS = 3650; // ~10 years
    uint256 public constant MAX_BATCH_SIZE = 35; // Reduced from 100 to 35 for gas optimization and reliability
    uint256 public constant BASE_RATIO = 1_000_000; // 1M XEN = 1 XBURN
    // ------------------------------------------------
    // ================ State Variables ==============
    // ------------------------------------------------
    
    // Address variables
    address public minter;
    
    // Counter variables
    uint256 private _tokenIdCounter;
    
    // Contract metadata URI for OpenSea, etc.
    string private _contractURI;
    
    // BurnLock struct for storing lock details
    struct BurnLock {
        uint256 xenAmount;      // Amount of XEN tokens burned
        uint256 maturityTs;     // Timestamp when the lock matures
        uint256 ampSnapshot;    // Amplifier snapshot at lock creation
        uint256 termDays;       // Lock term in days
        address owner;          // Owner of the lock
        bool claimed;           // Whether rewards have been claimed
        uint256 rewardAmount;   // Total reward amount (base + bonus)
        uint256 baseMint;       // Base mint amount without amplifier bonus
        
    }

    // tokenId => BurnLock details
    mapping(uint256 => BurnLock) public burnLocks;

    // ------------------------------------------------
    // ================ Custom Errors ================
    // ------------------------------------------------
    
    error OnlyMinter(address caller, address minter);
    error AlreadyClaimed(uint256 tokenId);
    error NonexistentToken(uint256 tokenId);
    error ClaimedTokenNotTransferable(uint256 tokenId);
    error InvalidTermDays(uint256 providedDays, uint256 maxDays);
    error ZeroAddressNotAllowed();
    error NotAuthorized(address caller);
    error BatchSizeTooLarge(uint256 provided, uint256 maximum);
    error RoyaltyTooHigh(uint256 provided, uint256 maximum);
    
    // ------------------------------------------------
    // ================= Events ======================
    // ------------------------------------------------
    
    event BurnLockCreated(
        uint256 indexed tokenId, 
        address indexed user, 
        uint256 amount, 
        uint256 termDays,
        uint256 maturityTimestamp
    );
    
    event MinterChanged(address indexed oldMinter, address indexed newMinter);
    event LockClaimed(uint256 indexed tokenId);
    event LockBurned(uint256 indexed tokenId);
    event ContractURIUpdated(string newURI);
    event RoyaltyInfoUpdated(address receiver, uint96 feeNumerator);

    // ------------------------------------------------
    // ================ Modifiers ====================
    // ------------------------------------------------
    
    /**
     * @dev Restricts function access to only the minter address
     */
    modifier onlyMinter() {
        if (msg.sender != minter) revert OnlyMinter(msg.sender, minter);
        _;
    }

    // ------------------------------------------------
    // ================ Constructor =================
    // ------------------------------------------------
    
    constructor() 
        ERC721("XEN Burn Lock", "XLOCK") 
        Ownable(msg.sender) 
    {
        // Set default royalty to 2.5% to contract owner
        _setDefaultRoyalty(msg.sender, 250);
        
        // Set default contract URI
        _contractURI = "data:application/json;base64,eyJuYW1lIjoiWEVOIEJ1cm4gTG9jayIsImRlc2NyaXB0aW9uIjoiQSBjb2xsZWN0aW9uIG9mIExvY2tlZCBYQlVSTiBwb3NpdGlvbnMgY3JlYXRlZCBieSBidXJuaW5nIFhFTiB0b2tlbnMuIEVhY2ggTkZUIHJlcHJlc2VudHMgYSBsb2NrZWQgcG9zaXRpb24gd2l0aCBldmVyeSBkZXRhaWwgc3RvcmVkIG9uLWNoYWluLiIsImltYWdlIjoiZGF0YTppbWFnZS9zdmcreG1sO2Jhc2U2NCxQSE4yWnlCamJHRnpjejBpWW1GelpTQjBlWEJsTWlJZ1ptbHNiRDBpSTJWa1pXUmxaQ0lnZUcxc2JuTTlJbWgwZEhBNkx5OTNkM2N1ZHpNdWIzSm5Mekl3TURFdmMzWm5JajQ4YzJWamRYSnBkSGtqYzI1c1lYUmxaRDA0Y0hjOEwzTmxZM1Z5YVhSNVBqeHpkSEp2YTJVdGJXbDBaWEp2YVdRK1BDOXpkSEp2YTJVdGJXbDBaWEp2YVdRK1BHRWdjRGtpYzNCc2FYUmxjam93TGpVaVBqeG5JRzltWm5ObGREMGlibTl1WlNJK1BHUnBZV2MrUEd4cGJtViBlREE6ZVRBZ2VESTJORFk6ZVRJMk5EWWlJSE4wZVd4bFBTSjNhV1IwYUhNNk9Dd2liM0JoWTJsMGVUb3hJaUF2UGp4c2FXNWXJER0xPSIsImV4dGVybmFsX2xpbmsiOiJodHRwczovL3hibHVybi5jb20iLCJzZWxsZXJfZmVlX2Jhc2lzX3BvaW50cyI6MjUwLCJmZWVfcmVjaXBpZW50IjoiMHgwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwIn0=";
    }

    // ------------------------------------------------
    // =============== NFT Minting ===================
    // ------------------------------------------------
    
    /**
     * @dev Internal function to create a lock
     * @param tokenId The NFT token ID
     * @param to The address that will own the NFT
     * @param xenAmount Amount of XEN burned
     * @param termDays Lock duration in days
     * @param ampSnapshot Amplifier value at lock creation
     * @param rewardAmount Total reward amount including bonuses
     */
    function _createLock(
        uint256 tokenId,
        address to,
        uint256 xenAmount,
        uint256 termDays,
        uint256 ampSnapshot,
        uint256 rewardAmount
    ) internal {
        // Calculate the base mint amount
        uint256 baseMint = xenAmount / BASE_RATIO; // Using updated BASE_RATIO
        
        // Set maturity timestamp
        uint256 maturityTs;
        if (termDays == 0) {
            // Immediately claimable if term is 0
            maturityTs = block.timestamp;
        } else {
            // Otherwise, add the exact number of days
            maturityTs = block.timestamp + (termDays * 1 days);
        }
            
        // Create the lock
        burnLocks[tokenId] = BurnLock({
            xenAmount: xenAmount,
            maturityTs: maturityTs,
            ampSnapshot: ampSnapshot,
            termDays: termDays,
            owner: to,
            claimed: false,
            rewardAmount: rewardAmount,
            baseMint: baseMint
        });
    }
    
    /**
     * @dev Mints a new XBURN lock NFT
     * @param to Address that will own the NFT
     * @param xenAmount Amount of XEN burned
     * @param termDays Lock duration in days
     * @param ampSnapshot Amplifier value at lock creation
     * @param rewardAmount Total reward amount including bonuses
     * @return tokenId The newly created token ID
     */
    function mint(
        address to,
        uint256 xenAmount,
        uint256 termDays,
        uint256 ampSnapshot,
        uint256 rewardAmount
    ) external onlyMinter returns (uint256) {
        // Validate inputs
        if (termDays > MAX_TERM_DAYS) revert InvalidTermDays(termDays, MAX_TERM_DAYS);
        if (to == address(0)) revert ZeroAddressNotAllowed();
        
        // Create new token ID
        uint256 tokenId = _tokenIdCounter++;
        
        // Create the lock
        _createLock(tokenId, to, xenAmount, termDays, ampSnapshot, rewardAmount);
        
        // Calculate maturity timestamp for the event
        uint256 maturityTs = termDays == 0 
            ? block.timestamp 
            : block.timestamp + (termDays * 1 days);
            
        // Emit event for indexing and tracking
        emit BurnLockCreated(tokenId, to, xenAmount, termDays, maturityTs);
        
        // Mint the NFT
        _safeMint(to, tokenId);
        
        return tokenId;
    }

    // ------------------------------------------------
    // ============= Lock Management =================
    // ------------------------------------------------
    
    /**
     * @dev Marks a lock as claimed
     * @param tokenId The token ID to update
     */
    function setClaimed(uint256 tokenId) external onlyMinter {
        if (_ownerOf(tokenId) == address(0)) revert NonexistentToken(tokenId);
        if (burnLocks[tokenId].claimed) revert AlreadyClaimed(tokenId);
        
        burnLocks[tokenId].claimed = true;
        emit LockClaimed(tokenId);
    }

    /**
     * @dev Burns an NFT (typically after claiming)
     * @param tokenId The token ID to burn
     */
    function burn(uint256 tokenId) external onlyMinter {
        if (_ownerOf(tokenId) == address(0)) revert NonexistentToken(tokenId);
        
        _burn(tokenId);
        emit LockBurned(tokenId);
    }

    // ------------------------------------------------
    // ================ Views ========================
    // ------------------------------------------------
    
    /**
     * @dev Gets all details for a specific lock
     * @param tokenId The token ID to query
     * @return xenAmount Amount of XEN burned
     * @return maturityTs Maturity timestamp
     * @return ampSnapshot Amplifier snapshot
     * @return termDays Lock term in days
     * @return claimed Whether rewards have been claimed
     * @return rewardAmount Total reward amount
     * @return baseMint Base mint amount
     * @return owner Owner of the lock
     */
    function getLockDetails(uint256 tokenId)
        external
        view
        returns (
            uint256 xenAmount,
            uint256 maturityTs,
            uint256 ampSnapshot,
            uint256 termDays,
            bool claimed,
            uint256 rewardAmount,
            uint256 baseMint,
            address owner
        )
    {
        if (_ownerOf(tokenId) == address(0)) revert NonexistentToken(tokenId);
        
        BurnLock storage lock = burnLocks[tokenId];
        return (
            lock.xenAmount,
            lock.maturityTs,
            lock.ampSnapshot,
            lock.termDays,
            lock.claimed,
            lock.rewardAmount,
            lock.baseMint,
            lock.owner
        );
    }

    /**
     * @dev Gets all lock token IDs owned by a specific user with pagination
     * @param user Address to query
     * @param page Page number (0-indexed)
     * @param pageSize Number of items per page
     * @return tokenIds Array of token IDs
     * @return totalPages Total number of pages available
     */
    function getAllUserLocks(address user, uint256 page, uint256 pageSize) 
        external 
        view 
        returns (uint256[] memory tokenIds, uint256 totalPages) 
    {
        // Protect against excessively large page sizes
        if (pageSize > MAX_BATCH_SIZE) revert BatchSizeTooLarge(pageSize, MAX_BATCH_SIZE);
        
        uint256 balance = balanceOf(user);

        // Calculate total pages with ceiling division
        totalPages = (balance + pageSize - 1) / pageSize;

        // Handle out of bounds pages
        if (page >= totalPages || balance == 0) {
            return (new uint256[](0), totalPages);
        }

        // Calculate actual page boundaries
        uint256 startIndex = page * pageSize;
        uint256 endIndex = startIndex + pageSize;
        if (endIndex > balance) {
            endIndex = balance;
        }

        // Create result array
        tokenIds = new uint256[](endIndex - startIndex);
        
        // Fill array with token IDs
        for (uint256 i = startIndex; i < endIndex; ++i) {
            tokenIds[i - startIndex] = tokenOfOwnerByIndex(user, i);
        }
        
        return (tokenIds, totalPages);
    }

    /**
     * @dev Parses a timestamp into year, month, and day
     * @param timestamp The timestamp to parse
     * @return year The year component
     * @return month The month component
     * @return day The day component
     */
    function parseTimestamp(uint256 timestamp)
        public
        pure
        returns (uint256 year, uint256 month, uint256 day)
    {
        // Accurate date calculation algorithm
        uint256 secs = timestamp;
        uint256 z = (secs / 86400) + 719468;
        uint256 era = (z >= 0 ? z : z - 146096) / 146097;
        uint256 doe = z - era * 146097;
        uint256 yoe = (doe - doe/1460 + doe/36524 - doe/146096) / 365;
        uint256 y = yoe + era * 400;
        uint256 doy = doe - (365*yoe + yoe/4 - yoe/100 + yoe/400);
        uint256 mp = (5*doy + 2)/153;
        uint256 d = doy - (153*mp+2)/5 + 1;
        
        uint256 m;
        if (mp < 10) {
            m = mp + 3;
        } else {
            m = mp - 9;
        }
        
        y = y + (m <= 2 ? 1 : 0);
        
        return (y, m, d);
    }

    /**
     * @dev Pads a number with a leading zero if less than 10
     * @param num The number to pad
     * @return The padded number as a string
     */
    function padZero(uint256 num) public pure returns (string memory) {
        return num < 10
            ? string(abi.encodePacked("0", num.toString()))
            : num.toString();
    }

    /**
     * @dev Formats a date based on timestamp
     * @param timestamp The timestamp to format
     * @return A formatted date string (YYYY-MM-DD)
     */
    function formatDate(uint256 timestamp) public pure returns (string memory) {
        (uint256 year, uint256 month, uint256 day) = parseTimestamp(timestamp);
        return string(
            abi.encodePacked(
                year.toString(),
                "-",
                padZero(month),
                "-",
                padZero(day)
            )
        );
    }

    /**
     * @dev Returns metadata URI for a token
     * @param tokenId The token ID to query
     * @return URI string with embedded metadata
     */
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override(ERC721) 
        returns (string memory) 
    {
        if (_ownerOf(tokenId) == address(0)) revert NonexistentToken(tokenId);
        
        BurnLock storage lock = burnLocks[tokenId];
        
        // Format the lock data for display
        string memory burnId = tokenId.toString();
        string memory xenBurnedNumeric = formatLargeNumber(lock.xenAmount / 1e18);
        string memory baseMint = (lock.baseMint / 1e18).toString();
        string memory totalReward = (lock.rewardAmount / 1e18).toString();

        // Calculate amplifier percentage
        uint256 amplifierPercent = lock.ampSnapshot > 0
            ? (lock.ampSnapshot * 100) / 3000
            : 0;
        string memory amplifier = amplifierPercent.toString();
        
        // Format term days
        string memory termDays = lock.termDays.toString();
        
        // Format maturity date
        string memory maturityDate = formatDate(lock.maturityTs);
        
        // Determine lock status
        bool isLocked = (block.timestamp < lock.maturityTs && !lock.claimed);
        string memory status = isLocked
            ? "Locked"
            : (lock.claimed ? "Claimed" : "Ready");
        
        // Generate SVG
        string memory svg = generateSVG(
            Strings.toHexString(address(this)),
            burnId,
            xenBurnedNumeric,
            baseMint,
            amplifier,
            termDays,
            maturityDate,
            totalReward
        );
        
        // Generate JSON metadata
        string memory json = generateJSON(
            burnId,
            xenBurnedNumeric,
            baseMint,
            amplifier,
            termDays,
            maturityDate,
            totalReward,
            status,
            svg
        );
        
        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(bytes(json))
            )
        );
    }

    function formatLargeNumber(uint256 number) private pure returns (string memory) {
        if (number >= 1e12) {
            uint256 trillions = number / 1e12;
            uint256 decimal = (number % 1e12) / 1e10;
            // Only include decimal if it's not zero
            if (decimal > 0) {
                return string(abi.encodePacked(
                    trillions.toString(), 
                    ".", 
                    decimal < 10 ? string(abi.encodePacked("0", decimal.toString())) : decimal.toString(), 
                    "T"
                ));
            } else {
                return string(abi.encodePacked(trillions.toString(), "T"));
            }
        } else if (number >= 1e9) {
            uint256 billions = number / 1e9;
            uint256 decimal = (number % 1e9) / 1e7;
            // Only include decimal if it's not zero
            if (decimal > 0) {
                return string(abi.encodePacked(
                    billions.toString(), 
                    ".", 
                    decimal < 10 ? string(abi.encodePacked("0", decimal.toString())) : decimal.toString(), 
                    "B"
                ));
            } else {
                return string(abi.encodePacked(billions.toString(), "B"));
            }
        } else if (number >= 1e6) {
            uint256 millions = number / 1e6;
            uint256 decimal = (number % 1e6) / 1e4;
            // Only include decimal if it's not zero
            if (decimal > 0) {
                return string(abi.encodePacked(
                    millions.toString(), 
                    ".", 
                    decimal < 10 ? string(abi.encodePacked("0", decimal.toString())) : decimal.toString(), 
                    "M"
                ));
            } else {
                return string(abi.encodePacked(millions.toString(), "M"));
            }
        }
        return number.toString();
    }
    /**
     * @dev Generates SVG for token display
     * @param contractAddress The contract address
     * @param burnId The token ID
     * @param xenBurnedNumeric Amount of XEN burned
     * @param baseMint Base mint amount
     * @param amplifier Amplifier percentage
     * @param termDays Term in days
     * @param maturityDate Maturity date string
     * @param totalReward Total reward amount
     * @return SVG string
     */
    function generateSVG(
        string memory contractAddress,
        string memory burnId,
        string memory xenBurnedNumeric,
        string memory baseMint,
        string memory amplifier,
        string memory termDays,
        string memory maturityDate,
        string memory totalReward
    ) internal pure returns (string memory) {
        return SVGGenerator.generateSVG(
            contractAddress,
            burnId,
            xenBurnedNumeric,
            baseMint,
            amplifier,
            termDays,
            maturityDate,
            totalReward
        );
    }

    /**
     * @dev Generates JSON metadata for the token
     * @param burnId The token ID
     * @param xenBurnedNumeric Amount of XEN burned
     * @param baseMint Base mint amount
     * @param amplifier Amplifier percentage
     * @param termDays Term in days
     * @param maturityDate Maturity date string
     * @param totalReward Total reward amount
     * @param status Current token status
     * @param svg SVG string 
     * @return JSON string
     */
    function generateJSON(
        string memory burnId,
        string memory xenBurnedNumeric,
        string memory baseMint,
        string memory amplifier,
        string memory termDays,
        string memory maturityDate,
        string memory totalReward,
        string memory status,
        string memory svg
    ) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                '{',
                '"name":"XBURN Lock Position #', burnId, '",',
                '"description":"This NFT represents a locked XBURN position created by burning XEN. ',
                'It contains all data on-chain including the SVG image and is redeemable for XBURN tokens at maturity.",',
                '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '",',
                '"attributes":[',
                    '{"trait_type":"XEN Burned","value":"', xenBurnedNumeric, '"},',
                    '{"trait_type":"Base Mint","value":"', baseMint, '"},',
                    '{"trait_type":"Amplifier","value":"', amplifier, '"},',
                    '{"trait_type":"Term Days","value":"', termDays, '"},',
                    '{"trait_type":"Maturity","value":"', maturityDate, '"},',
                    '{"trait_type":"Total Reward","value":"', totalReward, '"},',
                    '{"trait_type":"Status","value":"', status, '"}',
                ']',
                '}'
            )
        );
    }

    // ------------------------------------------------
    // ================ Royalty Support ==============
    // ------------------------------------------------

    /**
     * @dev Returns the contract-level metadata URI for marketplaces (OpenSea, etc.)
     * @return Contract URI string
     */
    function contractURI() public view returns (string memory) {
        return _contractURI;
    }
    
    /**
     * @dev Sets the contract-level metadata URI
     * @param newURI New contract URI
     */
    function setContractURI(string memory newURI) external onlyOwner {
        _contractURI = newURI;
        emit ContractURIUpdated(newURI);
    }
    
    /**
     * @dev Sets a new royalty receiver and fee
     * @param receiver Address to receive royalties
     * @param feeNumerator Fee in basis points (e.g., 250 = 2.5%)
     */
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        if (feeNumerator > 1000) revert RoyaltyTooHigh(feeNumerator, 1000); // Max 10%
        _setDefaultRoyalty(receiver, feeNumerator);
        emit RoyaltyInfoUpdated(receiver, feeNumerator);
    }
    
    /**
     * @dev Removes the default royalty configuration
     */
    function deleteDefaultRoyalty() external onlyOwner {
        _deleteDefaultRoyalty();
        emit RoyaltyInfoUpdated(address(0), 0);
    }

    // ------------------------------------------------
    // ================ Admin Functions ==============
    // ------------------------------------------------
    
    /**
     * @dev Sets the minter address
     * @param newMinter The new minter address
     */
    function setMinter(address newMinter) public {
        if (msg.sender != minter && msg.sender != owner() && minter != address(0)) {
            revert NotAuthorized(msg.sender);
        }
        if (newMinter == address(0)) revert ZeroAddressNotAllowed();
        
        address oldMinter = minter;
        minter = newMinter;
        
        emit MinterChanged(oldMinter, newMinter);
    }

    // ------------------------------------------------
    // ============ Internal Overrides ===============
    // ------------------------------------------------

    /**
     * @dev Update hook from ERC721
     * Updates owner in burnLocks when token is transferred
     * @param to Address receiving the token
     * @param tokenId Token ID being transferred
     * @param auth Address authorized to make the transfer
     * @return from Address that previously owned the token
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override(ERC721, ERC721Enumerable) returns (address) {
        address from = super._update(to, tokenId, auth);
        
        // Update owner in burnLocks when transferring
        if (from != address(0) && to != address(0)) {
            // Prevent transfer of claimed tokens
            if (burnLocks[tokenId].claimed) revert ClaimedTokenNotTransferable(tokenId);
            
            // Update ownership record
            burnLocks[tokenId].owner = to;
        }
        
        return from;
    }

    /**
     * @dev Required override for ERC721Enumerable
     * @param account Address to increase balance for
     * @param value Amount to increase balance by
     */
    function _increaseBalance(
        address account,
        uint128 value
    ) internal virtual override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    /**
     * @dev Required override for interface support including EIP-2981
     * @param interfaceId Interface identifier
     * @return bool True if supported
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721, ERC721Enumerable, ERC2981) returns (bool) {
        return 
            ERC721.supportsInterface(interfaceId) ||
            ERC721Enumerable.supportsInterface(interfaceId) ||
            ERC2981.supportsInterface(interfaceId);
    }
}