const { ethers } = require("hardhat")

const networkConfig = {
    5: {
        name: "goerli",
    },

    31337: {
        name: "hardhat",
    },
}

const developmentChains = ["hardhat", "localhost"]
// Polygon Mainnet DAI Address
const MATIC_DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"
// Random user's address that happens to have a lot of DAI on Polygon Mainnet
// using this address to payback the premium using HARDHAT IMPERSONATION
// IMPERSONATION => send transactions on behalf of any address, even without their private key. However, of course, this only works on the local development network
const MATIC_DAI_WHALE = "0xdfD74E3752c187c4BA899756238C76cbEEfa954B"
// Polygon Mainnet Pool contract address
const MATIC_POOL_ADDRESS_PROVIDER = "0xa97684ead0e402dc232d5a977953df7ecbab3cdb"

module.exports = {
    networkConfig,
    developmentChains,
    MATIC_DAI,
    MATIC_DAI_WHALE,
    MATIC_POOL_ADDRESS_PROVIDER,
}
