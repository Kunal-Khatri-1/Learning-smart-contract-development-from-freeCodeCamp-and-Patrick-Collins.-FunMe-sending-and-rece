const { ethers } = require("hardhat")
const { expect } = require("chai")

describe("Attacking Game.sol", function () {
    it("Attack.sol should generate same random number as Game.sol", async function () {
        // Deploy the Game contract
        const gameFactory = await ethers.getContractFactory("Game")
        const gameContract = await gameFactory.deploy({ value: ethers.utils.parseEther("0.1") })
        await gameContract.deployed()

        console.log("Game contract address", gameContract.address)

        // Deploy the attack contract
        const attackFactory = await ethers.getContractFactory("Attack")
        const attackContract = await attackFactory.deploy(gameContract.address)

        console.log("Attack contract address", attackContract.address)

        // Attack the Game contract
        const tx = await attackContract.attack()
        await tx.wait(1)

        const balanceGame = await gameContract.getBalance()
        // Balance of the Game contract should be 0
        expect(balanceGame).to.equal(ethers.BigNumber.from("0"))
    })
})
