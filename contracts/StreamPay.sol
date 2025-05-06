// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

/**
 * @title IERC7715 - Standard interface for delegation actions
 * @dev Interface for the ERC-7715 delegation standard
 */
interface IERC7715 {
    /**
     * @dev Emitted when a delegate is authorized
     */
    event DelegateAuthorized(address indexed delegator, address indexed delegate, bytes4 functionSelector);
    
    /**
     * @dev Emitted when a delegate authorization is revoked
     */
    event DelegateRevoked(address indexed delegator, address indexed delegate, bytes4 functionSelector);
    
    /**
     * @dev Returns whether `delegate` is authorized to execute function with `functionSelector` on behalf of `delegator`
     */
    function isAuthorizedDelegate(address delegator, address delegate, bytes4 functionSelector) external view returns (bool);
    
    /**
     * @dev Authorizes `delegate` to execute the function with `functionSelector` on behalf of msg.sender
     */
    function authorizeDelegate(address delegate, bytes4 functionSelector) external;
    
    /**
     * @dev Revokes authorization of `delegate` to execute the function with `functionSelector` on behalf of msg.sender
     */
    function revokeDelegate(address delegate, bytes4 functionSelector) external;
}

/**
 * @title StreamPay
 * @dev A decentralized payment streaming platform using ERC-7715 delegation standard
 * Allows users to create continuous payment streams with per-second accuracy
 */
contract StreamPay is Ownable, ReentrancyGuard, ERC165, IERC7715 {
    using SafeERC20 for IERC20;

    // Stream data structure
    struct Stream {
        address sender;         // The address of the stream creator
        address recipient;      // The address of the stream recipient
        address tokenAddress;   // The address of the ERC20 token
        uint256 startTime;      // The time when the stream starts
        uint256 stopTime;       // The time when the stream stops
        uint256 deposit;        // The total amount of tokens to be streamed
        uint256 ratePerSecond;  // The amount of tokens streamed per second
        uint256 remaining;      // Remaining balance in the stream
        bool isActive;          // Whether the stream is active
    }

    // Mapping from stream ID to Stream
    mapping(uint256 => Stream) public streams;
    
    // Mapping from delegator to delegate to function selector to authorization status
    mapping(address => mapping(address => mapping(bytes4 => bool))) private _delegateAuthorizations;
    
    // Counter for stream IDs
    uint256 private _nextStreamId;
    
    // Events
    event StreamCreated(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime,
        uint256 deposit,
        uint256 ratePerSecond
    );
    
    event StreamWithdrawn(
        uint256 indexed streamId,
        address indexed recipient,
        uint256 amount
    );
    
    event StreamCancelled(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 senderRefund,
        uint256 recipientAmount
    );
    
    event StreamPaused(
        uint256 indexed streamId,
        address indexed pauser
    );
    
    event StreamResumed(
        uint256 indexed streamId,
        address indexed resumer
    );

    /**
     * @dev Initializes the contract
     */
    constructor() Ownable(msg.sender) {
        _nextStreamId = 1;
    }
    
    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return 
            interfaceId == type(IERC7715).interfaceId || 
            super.supportsInterface(interfaceId);
    }
    
    /**
     * @dev See {IERC7715-isAuthorizedDelegate}
     */
    function isAuthorizedDelegate(address delegator, address delegate, bytes4 functionSelector) 
        public view override returns (bool) 
    {
        return _delegateAuthorizations[delegator][delegate][functionSelector];
    }
    
    /**
     * @dev See {IERC7715-authorizeDelegate}
     */
    function authorizeDelegate(address delegate, bytes4 functionSelector) public override {
        require(delegate != address(0), "StreamPay: delegate is the zero address");
        _delegateAuthorizations[msg.sender][delegate][functionSelector] = true;
        emit DelegateAuthorized(msg.sender, delegate, functionSelector);
    }
    
    /**
     * @dev See {IERC7715-revokeDelegate}
     */
    function revokeDelegate(address delegate, bytes4 functionSelector) public override {
        _delegateAuthorizations[msg.sender][delegate][functionSelector] = false;
        emit DelegateRevoked(msg.sender, delegate, functionSelector);
    }

    /**
     * @dev Creates a new stream from msg.sender to recipient
     * @param recipient The address receiving the stream
     * @param deposit The amount of tokens to be streamed
     * @param tokenAddress The ERC20 token address
     * @param startTime When the stream starts (can be in the future)
     * @param stopTime When the stream stops
     * @return The stream ID
     */
    function createStream(
        address recipient,
        uint256 deposit,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime
    ) external nonReentrant returns (uint256) {
        return _createStream(msg.sender, recipient, deposit, tokenAddress, startTime, stopTime);
    }
    
    /**
     * @dev Creates a stream on behalf of another user (delegated)
     * @param sender The address funding and initiating the stream
     * @param recipient The address receiving the stream
     * @param deposit The amount of tokens to be streamed
     * @param tokenAddress The ERC20 token address
     * @param startTime When the stream starts
     * @param stopTime When the stream stops
     * @return The stream ID
     */
    function createStreamOnBehalf(
        address sender,
        address recipient,
        uint256 deposit,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime
    ) external nonReentrant returns (uint256) {
        // Verify delegation authorization
        bytes4 functionSelector = this.createStreamOnBehalf.selector;
        require(
            isAuthorizedDelegate(sender, msg.sender, functionSelector),
            "StreamPay: not authorized to create stream on behalf"
        );
        
        return _createStream(sender, recipient, deposit, tokenAddress, startTime, stopTime);
    }
    
    /**
     * @dev Internal implementation for creating a stream
     */
    function _createStream(
        address sender,
        address recipient,
        uint256 deposit,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime
    ) private returns (uint256) {
        require(recipient != address(0), "StreamPay: recipient is the zero address");
        require(recipient != address(this), "StreamPay: recipient cannot be the contract");
        require(recipient != sender, "StreamPay: recipient cannot be the sender");
        require(deposit > 0, "StreamPay: deposit is zero");
        require(startTime >= block.timestamp, "StreamPay: start time before current time");
        require(stopTime > startTime, "StreamPay: stop time before start time");

        uint256 duration = stopTime - startTime;
        require(deposit >= duration, "StreamPay: deposit smaller than duration (min 1 token/sec)");
        
        // Calculate rate per second
        uint256 ratePerSecond = deposit / duration;
        
        // Transfer tokens from sender to contract
        IERC20(tokenAddress).safeTransferFrom(sender, address(this), deposit);
        
        // Create the stream
        uint256 streamId = _nextStreamId;
        _nextStreamId++;
        
        streams[streamId] = Stream({
            sender: sender,
            recipient: recipient,
            tokenAddress: tokenAddress,
            startTime: startTime,
            stopTime: stopTime,
            deposit: deposit,
            ratePerSecond: ratePerSecond,
            remaining: deposit,
            isActive: true
        });
        
        emit StreamCreated(
            streamId,
            sender,
            recipient,
            tokenAddress,
            startTime,
            stopTime,
            deposit,
            ratePerSecond
        );
        
        return streamId;
    }

    /**
     * @dev Calculate how much is currently withdrawable from the stream
     * @param streamId The stream ID
     * @return The withdrawable amount
     */
    function withdrawableAmount(uint256 streamId) public view returns (uint256) {
        Stream memory stream = streams[streamId];
        
        if (!stream.isActive || block.timestamp < stream.startTime) {
            return 0;
        }
        
        uint256 elapsedTime;
        if (block.timestamp >= stream.stopTime) {
            elapsedTime = stream.stopTime - stream.startTime;
        } else {
            elapsedTime = block.timestamp - stream.startTime;
        }
        
        uint256 earned = elapsedTime * stream.ratePerSecond;
        uint256 withdrawable = earned > stream.deposit ? stream.deposit : earned;
        return withdrawable - (stream.deposit - stream.remaining);
    }
    
    /**
     * @dev Withdraw tokens from a stream
     * @param streamId The stream ID
     * @param amount The amount to withdraw (if 0, withdraws the maximum available)
     */
    function withdrawFromStream(uint256 streamId, uint256 amount) external nonReentrant {
        _withdrawFromStream(streamId, msg.sender, amount);
    }
    
    /**
     * @dev Withdraw on behalf of another user (delegated)
     * @param streamId The stream ID
     * @param recipient The recipient of the stream
     * @param amount The amount to withdraw
     */
    function withdrawFromStreamOnBehalf(uint256 streamId, address recipient, uint256 amount) 
        external nonReentrant 
    {
        Stream memory stream = streams[streamId];
        require(stream.recipient == recipient, "StreamPay: recipient mismatch");
        
        // Verify delegation authorization
        bytes4 functionSelector = this.withdrawFromStreamOnBehalf.selector;
        require(
            isAuthorizedDelegate(recipient, msg.sender, functionSelector),
            "StreamPay: not authorized to withdraw on behalf"
        );
        
        _withdrawFromStream(streamId, recipient, amount);
    }
    
    /**
     * @dev Internal implementation of withdraw
     */
    function _withdrawFromStream(uint256 streamId, address recipient, uint256 amount) private {
        Stream storage stream = streams[streamId];
        require(stream.isActive, "StreamPay: stream is not active");
        require(stream.recipient == recipient, "StreamPay: caller is not the recipient");
        
        uint256 withdrawable = withdrawableAmount(streamId);
        require(withdrawable > 0, "StreamPay: no tokens available for withdrawal");
        
        // If amount is 0, withdraw everything available
        uint256 withdrawAmount = amount == 0 ? withdrawable : amount;
        require(withdrawAmount <= withdrawable, "StreamPay: amount exceeds withdrawable balance");
        
        // Update remaining balance
        stream.remaining -= withdrawAmount;
        
        // If the stream is over or all funds are withdrawn, mark it as inactive
        if (block.timestamp >= stream.stopTime || stream.remaining == 0) {
            stream.isActive = false;
        }
        
        // Transfer tokens to recipient
        IERC20(stream.tokenAddress).safeTransfer(recipient, withdrawAmount);
        
        emit StreamWithdrawn(streamId, recipient, withdrawAmount);
    }
    
    /**
     * @dev Cancel a stream
     * @param streamId The stream ID
     */
    function cancelStream(uint256 streamId) external nonReentrant {
        _cancelStream(streamId, msg.sender);
    }
    
    /**
     * @dev Cancel a stream on behalf of sender (delegated)
     * @param streamId The stream ID
     * @param sender The stream sender
     */
    function cancelStreamOnBehalf(uint256 streamId, address sender) external nonReentrant {
        Stream memory stream = streams[streamId];
        require(stream.sender == sender, "StreamPay: sender mismatch");
        
        // Verify delegation authorization
        bytes4 functionSelector = this.cancelStreamOnBehalf.selector;
        require(
            isAuthorizedDelegate(sender, msg.sender, functionSelector),
            "StreamPay: not authorized to cancel on behalf"
        );
        
        _cancelStream(streamId, sender);
    }
    
    /**
     * @dev Internal implementation of cancel
     */
    function _cancelStream(uint256 streamId, address caller) private {
        Stream storage stream = streams[streamId];
        require(stream.isActive, "StreamPay: stream is not active");
        require(
            stream.sender == caller || stream.recipient == caller,
            "StreamPay: caller is not the sender or recipient"
        );
        
        // Mark stream as inactive
        stream.isActive = false;
        
        // Calculate how much each party should receive
        uint256 recipientAmount = 0;
        if (block.timestamp > stream.startTime) {
            recipientAmount = withdrawableAmount(streamId);
        }
        
        uint256 senderRefund = stream.remaining - recipientAmount;
        
        // Reset remaining to 0
        stream.remaining = 0;
        
        // Transfer tokens to recipient and sender
        if (recipientAmount > 0) {
            IERC20(stream.tokenAddress).safeTransfer(stream.recipient, recipientAmount);
        }
        
        if (senderRefund > 0) {
            IERC20(stream.tokenAddress).safeTransfer(stream.sender, senderRefund);
        }
        
        emit StreamCancelled(streamId, stream.sender, stream.recipient, senderRefund, recipientAmount);
    }
    
    /**
     * @dev Pause a stream (temporary suspend)
     * @param streamId The stream ID
     */
    function pauseStream(uint256 streamId) external nonReentrant {
        Stream storage stream = streams[streamId];
        require(stream.isActive, "StreamPay: stream is not active");
        require(
            stream.sender == msg.sender || stream.recipient == msg.sender,
            "StreamPay: caller is not the sender or recipient"
        );
        
        // Calculate remaining balance based on current time
        uint256 withdrawable = withdrawableAmount(streamId);
        stream.remaining -= withdrawable;
        
        // Update timestamps for later resuming
        uint256 timeRemaining = 0;
        if (block.timestamp < stream.stopTime) {
            timeRemaining = stream.stopTime - block.timestamp;
        }
        
        // Store remaining time in stopTime temporarily (will be restored on resume)
        stream.stopTime = timeRemaining;
        
        // Mark as inactive
        stream.isActive = false;
        
        // If there are withdrawable tokens, transfer them
        if (withdrawable > 0) {
            IERC20(stream.tokenAddress).safeTransfer(stream.recipient, withdrawable);
        }
        
        emit StreamPaused(streamId, msg.sender);
    }
    
    /**
     * @dev Resume a paused stream
     * @param streamId The stream ID
     */
    function resumeStream(uint256 streamId) external nonReentrant {
        Stream storage stream = streams[streamId];
        require(!stream.isActive, "StreamPay: stream is already active");
        require(
            stream.sender == msg.sender,
            "StreamPay: only sender can resume the stream"
        );
        require(stream.remaining > 0, "StreamPay: no funds left in the stream");
        
        // Calculate new timestamps
        uint256 timeRemaining = stream.stopTime; // We stored remaining time here when paused
        stream.startTime = block.timestamp;
        stream.stopTime = block.timestamp + timeRemaining;
        
        // Reactivate the stream
        stream.isActive = true;
        
        emit StreamResumed(streamId, msg.sender);
    }
    
    /**
     * @dev Get stream base details
     * @param streamId The stream ID
     * @return sender The stream sender
     * @return recipient The stream recipient
     * @return tokenAddress The token address
     * @return deposit The original deposit
     * @return remaining The remaining balance
     * @return isActive Whether the stream is active
     */
    function getStreamBasicInfo(uint256 streamId) external view returns (
        address sender,
        address recipient,
        address tokenAddress,
        uint256 deposit,
        uint256 remaining,
        bool isActive
    ) {
        Stream memory stream = streams[streamId];
        return (
            stream.sender,
            stream.recipient,
            stream.tokenAddress,
            stream.deposit,
            stream.remaining,
            stream.isActive
        );
    }
    
    /**
     * @dev Get stream time details
     * @param streamId The stream ID
     * @return startTime The start time
     * @return stopTime The stop time
     * @return ratePerSecond The tokens per second
     * @return withdrawable The currently withdrawable amount
     */
    function getStreamTimeInfo(uint256 streamId) external view returns (
        uint256 startTime,
        uint256 stopTime,
        uint256 ratePerSecond,
        uint256 withdrawable
    ) {
        Stream memory stream = streams[streamId];
        return (
            stream.startTime,
            stream.stopTime,
            stream.ratePerSecond,
            withdrawableAmount(streamId)
        );
    }
}
