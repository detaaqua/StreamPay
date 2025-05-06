// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StreamToken
 * @dev ERC20 Token for use with StreamPay payment streaming system
 * This token provides standard ERC20 functionality plus minting capabilities
 */
contract StreamToken is ERC20, ERC20Burnable, Ownable {
    // Maximum supply in tokens (1 billion * 10^18)
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    
    // Keeps track of addresses authorized to mint tokens
    mapping(address => bool) private _minters;
    
    // Events
    event MinterAdded(address indexed account);
    event MinterRemoved(address indexed account);
    
    /**
     * @dev Constructor sets up initial supply and assigns ownership
     * @param initialSupply The amount to mint to the message sender
     */
    constructor(uint256 initialSupply) ERC20("StreamPay Token", "SPT") Ownable(msg.sender) {
        require(initialSupply <= MAX_SUPPLY, "Initial supply exceeds maximum");
        _mint(msg.sender, initialSupply);
    }
    
    /**
     * @dev Modifier to restrict function access to minters only
     */
    modifier onlyMinter() {
        require(isMinter(msg.sender), "StreamToken: caller is not a minter");
        _;
    }
    
    /**
     * @dev Checks if an address is authorized to mint tokens
     * @param account The address to check
     * @return True if the address is a minter, false otherwise
     */
    function isMinter(address account) public view returns (bool) {
        return _minters[account] || account == owner();
    }
    
    /**
     * @dev Adds a new minter address
     * @param account The address to authorize as a minter
     */
    function addMinter(address account) public onlyOwner {
        require(account != address(0), "StreamToken: cannot add zero address as minter");
        _minters[account] = true;
        emit MinterAdded(account);
    }
    
    /**
     * @dev Removes a minter address
     * @param account The address to remove from minters
     */
    function removeMinter(address account) public onlyOwner {
        _minters[account] = false;
        emit MinterRemoved(account);
    }
    
    /**
     * @dev Mint new tokens (only callable by minters)
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyMinter {
        require(to != address(0), "StreamToken: mint to the zero address");
        require(totalSupply() + amount <= MAX_SUPPLY, "StreamToken: exceeds maximum supply");
        _mint(to, amount);
    }
    
    /**
     * @dev Creates a test faucet function to get tokens for testing purposes
     * ONLY FOR TESTNET/DEVELOPMENT - REMOVE IN PRODUCTION
     * @param amount The amount of tokens to claim (limited to 1000 tokens)
     */
    function faucet(uint256 amount) public {
        require(amount <= 1000 * 10**18, "StreamToken: faucet limited to 1000 tokens");
        require(totalSupply() + amount <= MAX_SUPPLY, "StreamToken: exceeds maximum supply");
        _mint(msg.sender, amount);
    }
    
    /**
     * @dev Transfers tokens and validates if the recipient is a contract.
     * If the recipient is a contract, it will attempt to call onERC20Received on it
     * to ensure the contract can handle token transfers properly.
     * @param recipient The address to transfer to
     * @param amount The amount to transfer
     * @return A boolean that indicates if the operation was successful
     */
    function safeTransfer(address recipient, uint256 amount) public returns (bool) {
        transfer(recipient, amount);
        
        // Check if recipient is a contract
        uint256 size;
        assembly {
            size := extcodesize(recipient)
        }
        
        if (size > 0) {
            // The receiver is a contract, try to notify it
            try IERC20Receiver(recipient).onERC20Received(msg.sender, amount) returns (bool success) {
                require(success, "StreamToken: ERC20 transfer rejected by recipient");
            } catch {
                // The contract doesn't implement the callback, continue anyway
            }
        }
        
        return true;
    }
    
    /**
     * @dev Returns the current token cap (maximum supply)
     * @return The cap amount
     */
    function cap() external pure returns (uint256) {
        return MAX_SUPPLY;
    }
    
    /**
     * @dev Returns the number of decimals used for token amounts
     * @return The number of decimals (18 is the standard for most ERC20 tokens)
     */
    function decimals() public view virtual override returns (uint8) {
        return 18;
    }
}

/**
 * @title IERC20Receiver
 * @dev Interface for contracts that want to support safe ERC20 transfers
 */
interface IERC20Receiver {
    /**
     * @dev Called when tokens are transferred to a contract
     * @param sender The address which initiated the transfer
     * @param amount The amount of tokens transferred
     * @return A boolean indicating if the transfer was accepted
     */
    function onERC20Received(address sender, uint256 amount) external returns (bool);
}
