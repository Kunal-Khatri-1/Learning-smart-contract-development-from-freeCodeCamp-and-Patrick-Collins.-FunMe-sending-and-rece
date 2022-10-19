const { network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

// in chainlink docs, premium section = 0.25 LINK => for each request there is a base fee of 0.25
// anytime we want to request a random number it will take 0.25 LINK or Oracle Gas
// unlike price feed, not enough sponser for random numbers => have to pay for it
const BASE_FEE = ethers.utils.parseEther("0.25")
// this is a calculated value based on the gas price of the chain
// if we were to request random number on ethereum
// and ETH price sky rocketed say $1,000,000,000 => gas will be expensive
// when chainlink nodes respond, they pay the gas fee to give us randomness and do external execution
// performUpkeep and fulfillRandomWords are called by the chainlink nodes and paying gas for it
// they get paid in Oracle gas to offset those costs
// chainlink nodes have a calculated variable GAS_PRICE_LINK which fluctuates based of the price of the actual chain
const GAS_PRICE_LINK = 1e9 // Link per gas

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const args = [BASE_FEE, GAS_PRICE_LINK]

    if (developmentChains.includes(network.name)) {
        log("local network detected, Deploying mocks...")
        // deploy a mock vrfV2Coordianator
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        })
        log("Mocks Deployed!!")
        log("--------------------------------------------")
    }
}

module.exports.tags = ["all", "mocks"]
