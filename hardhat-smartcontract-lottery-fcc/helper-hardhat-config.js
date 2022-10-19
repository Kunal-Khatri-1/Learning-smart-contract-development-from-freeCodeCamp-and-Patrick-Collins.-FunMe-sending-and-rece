const { ethers } = require("hardhat")

const networkConfig = {
    5: {
        name: "goerli",
        vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
        entranceFee: ethers.utils.parseEther("0.01"),
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        subscriptionId: "4409",
        callbackGasLimit: "500000", // 500,000
        interval: "30", // 30 seconds
    },

    31337: {
        name: "hardhat",
        entranceFee: ethers.utils.parseEther("0.01"),
        // for hardhat our mock doesn't care what gasLane we are working on, because we are mocking it anyways
        // using the same gasLane as Goerli, we can use anything here
        // 30 gwei key hash field
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        callbackGasLimit: "700000",
        interval: "30", // 30 seconds
    },
}

const developmentChains = ["hardhat", "localhost"]

module.exports = {
    networkConfig,
    developmentChains,
}
