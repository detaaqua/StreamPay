# StreamPay - MetaMask Delegation Payment Platform

## Overview

StreamPay is a cutting-edge Web3 payment platform that leverages MetaMask Delegation Toolkit's ERC-7715 Actions to create a seamless, secure, and decentralized payment experience. Our platform focuses on token streaming functionality and innovative delegation protocols to solve many of the pain points associated with traditional blockchain transactions.

## 🌟 Features

- **Delegated Transactions**: Execute blockchain transactions without directly interacting with the blockchain
- **Token Streaming**: Set up subscription-based payment models with continuous token streams
- **Cross-Chain Compatibility**: Operate seamlessly across multiple blockchain networks
- **Smart Contract Automation**: Automate payment flows through delegation
- **User-Friendly Dashboard**: Monitor all delegations and payment streams in one place
- **QR Code Payments**: Simplify the payment process with quick QR scanning


## 🔧 Technology Stack

- **Frontend**:
  - React.js
  - Tailwind CSS
  - MetaMask SDK
  - Ethers
- **Smart Contracts**:
  - Solidity
  - ERC-7715 implementation
  - Zero-knowledge proofs for delegation verification

- **Backend/Infrastructure**:
  - Node.js & Express.js
  - MongoDB (for off-chain data)
  - Vercel (deployment)

## 📋 Prerequisites

- Node.js (v16.x or later)
- MetaMask extension installed
- Basic understanding of blockchain concepts
- (Optional) An Ethereum testnet account with test ETH

## 🛠️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/detaaqua/StreamPay.git
   cd streampay
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory and add:
   ```
   REACT_APP_INFURA_ID=your_infura_id
   REACT_APP_CONTRACT_ADDRESS=your_contract_address
   REACT_APP_CHAIN_ID=1 # Mainnet, use appropriate chain ID for testnet
   ```

4. **Run the development server**:
   ```bash
   npm start
   # or
   yarn start
   ```

5. **Build for production**:
   ```bash
   npm run build
   # or
   yarn build
   ```

## 🔐 Using MetaMask Delegation

### Setting Up a Delegation

1. Connect your MetaMask wallet by clicking "Connect Wallet"
2. Navigate to the "Delegations" section
3. Choose the delegation type (one-time, recurring, or conditional)
4. Set parameters (recipient, amount, time constraints, etc.)
5. Sign the delegation message (this doesn't send tokens yet)
6. Your delegation is now active and can be executed according to your parameters

### Token Streaming

1. Navigate to the "Stream" section
2. Set up your token stream parameters:
   - Token type
   - Amount per time unit
   - Duration
   - Recipient address
3. Approve the token allowance
4. Start the stream

## 📊 Architecture

Our implementation of ERC-7715 Actions focuses on:

```
User Wallet ⟷ Delegation Manager ⟷ Smart Contract Executor ⟷ Blockchain
```

The Delegation Manager handles all delegation logic, including:
- Validation of delegation parameters
- Secure storage of delegation intents
- Execution of delegated transactions
- Management of token streaming

## 🤝 Contributing

We welcome contributions to DQPay! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to submit pull requests, report bugs, and suggest features.

## 📝 Smart Contract Documentation

The core smart contracts that power DQPay's delegation functionality include:

### StreamPayDelegator.sol

This contract implements the ERC-7715 standard and manages delegation permissions:

```solidity
// Example signature for delegation approval
function approveDelegation(
    address delegatee,
    bytes32 intentHash,
    uint256 validUntil,
    bytes calldata signature
) external returns (bool);
```

### StreamPayTokenStream.sol

Manages continuous token streaming based on time:

```solidity
// Example signature for starting a token stream
function startStream(
    address recipient,
    address token,
    uint256 amountPerSecond,
    uint256 duration
) external returns (uint256 streamId);
```

## 🔄 Integration Guide

### Integrating with Your dApp

```javascript
// Example JavaScript integration
import { StreamPay } from '@streampay/sdk';

// Initialize StreamPay
const streampay = new StreamPay({
  provider: window.ethereum,
  contractAddress: 'YOUR_CONTRACT_ADDRESS'
});

// Create a delegation
const delegation = await streampay.createDelegation({
  delegatee: '0x...',  // Delegatee address
  intent: {
    action: 'transfer',
    token: '0x...',    // Token address
    amount: '1000000000000000000', // 1 token in wei
    recipient: '0x...' // Recipient address
  },
  validUntil: Math.floor(Date.now() / 1000) + 86400 // 24 hours
});

// Sign the delegation
const signedDelegation = await streampay.signDelegation(delegation);
```

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- MetaMask for their incredible Delegation Toolkit
- The Ethereum community for their support of ERC-7715
- All contributors who have helped make StreamPay possible

---
