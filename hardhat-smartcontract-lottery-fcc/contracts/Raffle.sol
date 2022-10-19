// SPDX-License-Identifier: MIT

// Raffle
// Enter the lottery (paying some amount)
// Pick a random winner (verifiably random)
// winner to be selecte very X minutes => completly automated
// Chainlink Oracle => Randomness, Automated Execution

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
// for automatic trigger picking a random winner
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error Raffle__NotEnoughETHEntered();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);

/**@title A sample Raffle Contract
 * @author Kunal Khatri
 * @notice This contract is for creating an untamperable decentralized samrtcontract
 * @dev This implements Chainlink VRF v2 and Chainlink Keepers
 */
contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
    /* Type Declarations */
    // kindof secretly creating uint256 where 0 => OPEN and 1 => CALCULATING
    enum RaffleState {
        OPEN,
        CALCULATING
    }

    /* State Variables */
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;

    // Lottery variables
    address private s_recentWinner;
    // tricky to handle states like this
    uint256 private s_state; // pending, open, closed, calculating
    // using enums => enums can be used to create custom types with a finite set of "constant values"
    RaffleState private s_raffleState;
    // previous block.timestamp
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    /* Events */
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    /* Functions */
    // vrfCoordinatorV2 is the address of the contract that does the random number verification
    constructor(
        address vrfCoordinatorV2, // address
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        // s_raffleState = RaffleState(0);
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    function enterRaffle() public payable {
        // not gas efficient, using custom error codes
        // require (msg.value > i_entranceFee, "Not enough ETH!")

        if (msg.value < i_entranceFee) {
            revert Raffle__NotEnoughETHEntered();
        }
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__NotOpen();
        }
        s_players.push(payable(msg.sender));

        // Emit an event when we updata a dynamic array or mapping
        // Named events with the function name reversed
        emit RaffleEnter(msg.sender);
    }

    /**
     * @dev this is the function that the chainlink keeper nodes call
     * they look for the `upkeepNeeded` to return true
     * The following should be true in order to return true:
     * 1. Our time interval should have passed
     * 2. The lottery should have at least 1 player, and have some ETH
     * 3. Our subscription is funded with link
     * 4. The lottery should be in an "open" state
     *      not allow new participants in time period when waiting for random number to return and requested random winner
     */

    // bytes calldata checkData allows us to specify anything we want when we call checkUpkeep function
    // bytes type parameter => we can even can even specify this to call other functions
    // bytes => a lot of advanced stuff possible by having an input parameter as type bytes
    // call data does not work with strings so
    // bytes calldata /*checkData*/ => bytes memory checkData
    function checkUpkeep(
        bytes memory /*checkData*/
    )
        public
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        // true if lottery is open and false it it is calculating
        bool isOpen = (RaffleState.OPEN == s_raffleState);
        // block.timestamp - last block.timestamp => time elapsed > interval
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = address(this).balance > 0;
        // if upkeepNeeded returns true then request a new random number and end the lottery
        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
        return (upkeepNeeded, "0x0");
    }

    // function that chainlink nodes automatically execute after checkUpkeep returns true
    // this function will request the random number
    // this function is gonna be called by chainLink keepers network
    // this makes it automatically run without us having to interact with it.
    // external functions are cheaper than public
    // but changing it to public so that performUpkeep can use it
    function performUpkeep(
        bytes calldata /*performData*/
    ) external override {
        // request the random number
        // once we get it, do something with it
        // chainLink VRF is a two transaction process
        // this is much better than having one transaction process
        // if one txn process then people could brute force try to simuate calls to see what they can manipulate in their favour

        // requestRandomWords returns a requestID uint256
        // requestRandomWords from VRFv2Consumer
        // requestId = COORDINATOR.requestRandomWords(
        //      keyHash, // gasLane => tells the node the maximum gas price you are willing to pay for a request in wei
        //      s_subscriptionId,    // subscritption ID that this contract uses for funding requests
        // there is a contract on chain, which we can use to fund any subscription for any of these external data/external comutation bits
        // in this contract there is a list of subscritptions for people to make request to
        // so we need the id of the subscription that we are using to request for random number and pay the link Oracle gas
        //     requestConfirmations, // how many confirmations the ChainLink node should wait before responding
        //     callbackGasLimit,    // limit to how much gas to use for the callback request to your contract's fulfillRandomWords()
        // this sets a limit on how much computation fulfillRandomWords can do
        // way to protect spending too much gas
        // for eg we accidently code our contract in a way that fulfillRandomWords is incredibly gas expensive => block the random number from responding
        //     numWords     // how many random numbers we want to get
        // );

        // making sure that it only get called when checkup is true
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            // passing some variables so that whoever is running into this bug can see why are getting this error
            revert Raffle__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        }

        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );

        emit RequestedRaffleWinner(requestId);
    }

    // function that the chainLink node calls => fulfillRandomWords
    // we will get an array of random words
    // it will have only one element since we set NUM_WORDS = 1
    // random word can be very massive uint256
    // our players array will not be that big
    // to choose a winner from the big random number we
    // use the modulo function
    // this tells the function we know you need uint256 but we are not going to use the requestId
    function fulfillRandomWords(
        uint256,
        /*requestId*/
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_raffleState = RaffleState.OPEN;
        // resetting the s_players array after someone has won the lottery
        s_players = new address payable[](0);
        // everytime a winner is picked we want to reset the timestamp so that we can wait another interval and let people participate in the lottery
        s_lastTimeStamp = block.timestamp;

        // sending the money to the winner
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Raffle__TransferFailed();
        }
        // emit an event so that there is easily queryable history of winners
        emit WinnerPicked(recentWinner);
    }

    // second function => random number will be returned
    // txn we get the random number from the chainLink network, that's when we will send the money to the winner

    /* View/ Pure functions */
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    // since constant variables are stored in bytcode
    // this is not read from the storage
    // therefore can be restricted to pure
    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLatestTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}

// chainlink Keepers
// automatically trigger picking a random winner based on time period without us having to interact with it and in decentralized manner
// in order to automatically trigger smart contract based on some parameter (like time or price of some asset etc...) we can use chainlik keepers to do it
// two important methods that are part of keeper Compatible Interface
// checkUpkeep =>
//      this is where off chain computation happens
//      thi method is not run on chain. This is run offchain by a node in the chainlink keeper network
//      the gas used here is not actually the gas used onchain
//      if this method returns upkeepNeeded is needed then its goin to perform upkeep onchain
//      generate data off chain and then pass that in as checkData then that becomes the performData that's passed into performUpkeep
// performUpkeep =>
//      verify that things are correct/ things should be modified and run onchain and actually make the state change
// copy the keeper contract address and register that contract for upKeep
