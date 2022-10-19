const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle, vrfCoordinatorV2Mock, raffleEntranceFee, deployer, interval
          const chainId = network.config.chainId

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              // deploy contracts with tag "all"
              await deployments.fixture(["all"])

              raffle = await ethers.getContract("Raffle", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              raffleEntranceFee = await raffle.getEntranceFee()
              interval = await raffle.getInterval()
          })

          describe("constructor", function () {
              it("initializes the Raffle correctly", async function () {
                  // Ideally we make our test have just 1 assert per "it"
                  const raffleState = await raffle.getRaffleState()
                  // raffleState will be in a bigNumber format, so have to stringify it
                  assert.equal(raffleState.toString(), "0")
                  assert.equal(interval.toString(), networkConfig[chainId]["interval"])
              })
          })

          describe("enterRaffle", function () {
              it("reverts when you don't pay enough", async function () {
                  await expect(raffle.enterRaffle()).to.be.revertedWith(
                      "Raffle__NotEnoughETHEntered"
                  )
              })

              it("records players when they enter", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const playerFromContract = await raffle.getPlayer(0)
                  assert.equal(playerFromContract, deployer)
              })
              it("emits event on enter", async function () {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "RaffleEnter"
                  )
              })
              it("doesn't allow entrance when raffle is calculating", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  // manipulating hardhat blockchain time for unit testing
                  // this is required so that checkUpkeep returns true
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  // mine one extra block
                  // await network.provider.request({method: "evm_mine", params: []})
                  await network.provider.send("evm_mine", [])
                  // pretend to be a Chainlink keeper
                  await raffle.performUpkeep([])
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
                      "Raffle__NotOpen"
                  )
              })
              describe("checkUpkeep", function () {
                  it("retruns false if people haven't send any ETH", async function () {
                      await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                      await network.provider.send("evm_mine", [])
                      // checkUpkeep is a public function
                      // if we run raffle.checkUpkeep([]) => kick off a transaction
                      // if this was a public view function, it wouldn't
                      // simulate sending a transaction and seeing what this upkeepNeeded will return
                      const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                      // upkeepNeeded should return false
                      assert(!upkeepNeeded)
                  })
                  it("returns false if raffle isn't open", async function () {
                      await raffle.enterRaffle({ value: raffleEntranceFee })
                      await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                      await network.provider.send("evm_mine", [])
                      await raffle.performUpkeep("0x") // "0x" => blank bytes object
                      const raffleState = await raffle.getRaffleState()
                      const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                      assert.equal(raffleState.toString(), "1")
                      assert.equal(upkeepNeeded, false)
                  })
                  it("returns false if enough time hasn't passed", async function () {
                      await raffle.enterRaffle({ value: raffleEntranceFee })
                      await network.provider.send("evm_increaseTime", [interval.toNumber() - 10])
                      await network.provider.send("evm_mine", [])
                      const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x")
                      assert(!upkeepNeeded)
                  })
                  it("returns true if enough time has passed, has players, and is open", async function () {
                      await raffle.enterRaffle({ value: raffleEntranceFee })
                      await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                      await network.provider.send("evm_mine", [])
                      const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x")
                      console.log(upkeepNeeded)
                      assert(upkeepNeeded)
                  })
              })
              describe("performUpkeep", function () {
                  it("can only run if checkUpkeep returns true", async function () {
                      await raffle.enterRaffle({ value: raffleEntranceFee })
                      await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                      await network.provider.send("evm_mine", [])

                      const txn = await raffle.performUpkeep([])
                      assert(txn)
                  })
                  it("reverts when checkUpkeep is false", async function () {
                      await expect(raffle.performUpkeep([])).to.be.revertedWith(
                          "Raffle__UpkeepNotNeeded"
                      )
                  })
                  it("updates the raffle state, emits an event, and calls the vrf coordinator", async function () {
                      await raffle.enterRaffle({ value: raffleEntranceFee })
                      await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                      await network.provider.send("evm_mine", [])
                      const txResponse = await raffle.performUpkeep([])
                      const txReceipt = await txResponse.wait(1)
                      // this is because requestRandomWords function is called before emitting RequestedRaffleWinner event
                      // in the vrfCoordinatorMock there is a event that is emmited when requestRandomWords is called
                      // so first requestRandomWords emit an event and then RequestedRaffleWinner is emitted
                      const requestId = txReceipt.events[1].args.requestId
                      const raffleState = await raffle.getRaffleState()
                      assert(requestId.toNumber() > 0)
                      assert(raffleState.toString() == "1")
                  })
              })

              describe("fulfillRandomWords", function () {
                  //   beforeEach(async function () {

                  //   })
                  // fulfillRandomWords can be called if there is a requestId (by performUpkeep)
                  it("can only be called after performUpkeep", async function () {
                      await raffle.enterRaffle({ value: raffleEntranceFee })
                      await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                      await network.provider.send("evm_mine", [])
                      const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x")
                      console.log(upkeepNeeded)

                      // in the VRFCoordinatorV2Mock contract, fulfillRandomWords(uint256 _requestId, address _consumer) function
                      // checking if the request does not exist, revert with "nonexistent request"

                      // hard to test every single possible reqeustId, future soln => fuzz testing
                      await expect(
                          vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                      ).to.be.revertedWith("nonexistent request")

                      await expect(
                          vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
                      ).to.be.revertedWith("nonexistent request")
                  })
              })
              // Massive test => test that puts everything together
              it("picks a winner, resets the lottery, and sends the money", async function () {
                  const additionalEntrants = 3
                  const startingAccountIndex = 1 // deployer = 0
                  const accounts = await ethers.getSigners()
                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + additionalEntrants;
                      i++
                  ) {
                      const accountConnectedRaffle = raffle.connect(accounts[i])
                      await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee })
                  }

                  const startingTimeStamp = await raffle.getLatestTimeStamp()

                  // performUpkeep (mock being chainlink keepers) which would kick off calling
                  // fulfillRandomWords(mock being the Chainlink vrf)
                  // if we are on testnet we will have to wait for the fulfillRandomWords to be called
                  // but in local blockchain we can manipulate anything we want
                  // but we will be simulating that we do need to wait for that event to be called
                  // we will have to set up a listner
                  // but we don't want this test to finish before listner has done listening
                  // solution ? => Promise!

                  // event listner should be set up befor enterin the raffle
                  // but this doesn't matter much in local network
                  await new Promise(async function (resolve, reject) {
                      // we don't want to wait forever, maybe there is an issue
                      // want to reject it if there is an issue
                      // see hardhat.config, mocha timeout =>
                      // if the this event is not fired in 200s then this will be considered a failure
                      raffle.once("WinnerPicked", async () => {
                          console.log("Found the event")
                          try {
                              const recentWinner = await raffle.getRecentWinner()
                              console.log(recentWinner)
                              console.log(accounts[2].address)
                              console.log(accounts[0].address)
                              console.log(accounts[1].address)
                              console.log(accounts[3].address)
                              const winnerEndingBalance = await accounts[2].getBalance()

                              const raffleState = await raffle.getRaffleState()
                              const endingTimeStamp = await raffle.getLatestTimeStamp()
                              const numPlayers = await raffle.getNumberOfPlayers()

                              assert.equal(numPlayers.toString(), "0")
                              assert.equal(raffleState.toString(), "0")
                              assert(endingTimeStamp > startingTimeStamp)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(
                                      raffleEntranceFee
                                          .mul(additionalEntrants)
                                          .add(raffleEntranceFee)
                                          .toString()
                                  )
                              )
                          } catch (error) {
                              console.log("This error: ", error)
                              reject()
                          }

                          resolve()
                      })
                      // setting up the listner

                      // before event is fired we need to call performUpkeep and fulfillRandomWords
                      // below, we will fire the event, and the listner will pick it up, and resolve
                      let winnerStartingBalance
                      try {
                          await raffle.enterRaffle({ value: raffleEntranceFee })
                          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                          await network.provider.send("evm_mine", [])
                          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x")
                          console.log(upkeepNeeded)

                          console.log("-----------")
                          console.log("UpkeepNeeded: ", upkeepNeeded)
                          const tx = await raffle.performUpkeep([])
                          console.log("-----------------------------")
                          const txReceipt = await tx.wait(1)
                          // const winnerStartingBalance = await
                          console.log(txReceipt.events[1].args.requestId, raffle.address)

                          winnerStartingBalance = await accounts[2].getBalance()
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              txReceipt.events[1].args.requestId,
                              raffle.address
                          )
                      } catch (error) {
                          console.log("-------------------------------------")
                          reject()
                      }
                  })
              })
          })
      })
