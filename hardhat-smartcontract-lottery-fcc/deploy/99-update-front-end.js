const { ethers, network } = require("hardhat")
const fs = require("fs")

const FRONT_END_ADDRESSES_FILE =
    "../nextjs-smartcontract-lottery-fcc/constants/contractAddresses.json"
const FRONT_END_ABI_FILE = "../nextjs-smartcontract-lottery-fcc/constants/abi.json"

module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("updating front end ....")

        updateContractAddresses()
        updateAbi()
    }
}

// contract.interface ⇒ Interface
// This is the ABI as an Interface.
// ABI =====> Interface
// Inteface => The Interface Class abstracts the encoding and decoding required to interact with contracts on the Ethereum network.
// Interface => An Interface helps organize Fragments by type as well as provides the functionality required to encode, decode and work with each component.
// Fragment => An ABI is a collection of Fragments, where each fragment specifies: An Error An Event A Function A Constructor

// ethers.utils.FormatTypes.json ⇒ string
// This returns a JavaScript Object which is safe to call JSON.stringify on to create a JSON string.
async function updateAbi() {
    const raffle = await ethers.getContract("Raffle")
    fs.writeFileSync(FRONT_END_ABI_FILE, raffle.interface.format(ethers.utils.FormatTypes.json))
}

async function updateContractAddresses() {
    const raffle = await ethers.getContract("Raffle")
    const currentAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE), "utf-8")
    const chainId = network.config.chainId.toString()
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in
    // this means that if there is a key chainId in object contractAddresses
    if (chainId in currentAddresses) {
        // if it does not include address then add the address
        if (!currentAddresses[chainId].includes(raffle.address)) {
            currentAddresses[chainId].push(raffle.address)
        }
    }
    {
        currentAddresses[chainId] = [raffle.address]
    }

    fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses))
}

module.exports.tags = ["all", "forntend"]
