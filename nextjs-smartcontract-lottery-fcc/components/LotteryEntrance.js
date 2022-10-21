// have a function to enter the lottery

import { contractAddresses, abi } from "../constants"
// dont export from moralis when using react
import { useMoralis, useWeb3Contract } from "react-moralis"
import { useEffect, useState } from "react"
import { ethers } from "ethers"
// this gives a dispatch function
import { Info, useNotification } from "web3uikit"

export default function LotteryEntrance() {
    // reason why moralis knows which chain we are on is because
    // the Header passes up all the information about the metamask to the MoralisProvider(in _app.js)
    // then MoralisProvider(in _app.js) passes it down to all the components inside those moralis provided tags
    // this gives the hex version of the chainId
    // const {chainId} = useMoralis()
    const { isWeb3Enabled, chainId: chainIdHex } = useMoralis()
    const chainId = parseInt(chainIdHex)
    const raffleAddress = chainId in contractAddresses ? contractAddresses[chainId][0] : null
    // making entranceFee global
    // why making a state expained in useEffect
    const [entranceFee, setEntranceFee] = useState("0")
    const [numPlayers, setNumPlayers] = useState("0")
    const [recentWinner, setRecentWinner] = useState("0")

    // dispatch is a little popup we will get
    const dispatch = useNotification()

    // runContractFunction can both send transaction and read state
    // all the variables => data, error, runContractFunction, isFetching, isLoading
    const {
        runContractFunction: enterRaffle,
        isLoading,
        isFetching,
    } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "enterRaffle",
        msgValue: entranceFee,
        params: {},
    })

    const { runContractFunction: getEntranceFee } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress, // specify the networkId
        functionName: "getEntranceFee",
        params: {},
    })

    const { runContractFunction: getNumberOfPlayers } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress, // specify the networkId
        functionName: "getNumberOfPlayers",
        params: {},
    })

    const { runContractFunction: getRecentWinner } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress, // specify the networkId
        functionName: "getRecentWinner",
        params: {},
    })

    async function updateUIValues() {
        // const entranceFee = (await getEntranceFee()).toString()
        // console.log(entranceFee)
        // can't display entranceFee to the browser directly because before the value was undefined and now it is some XYZ
        // but the browser didn't re-render when the value of the entranceFee changed => browser showing blank while it displays value on the console
        // To re-render the browser when the entranceFee changes => useState() Hook
        const entranceFeeFromCall = (await getEntranceFee()).toString()
        const numPlayersFromCall = (await getNumberOfPlayers()).toString()
        const recentWinnerFromCall = (await getRecentWinner()).toString()

        setEntranceFee(entranceFeeFromCall)
        setNumPlayers(numPlayersFromCall)
        setRecentWinner(recentWinnerFromCall)

        // may see 0 in the console => setEntranceFee has not stopped running
        console.log(entranceFee)
    }

    // calling getEntranceFee function of the Raffle contract to pass it in the msgValue field in useWeb3Contract above
    // right when the lottery entrance loads, we are gonna run a function to read the entranceFee value
    // only try to get the RaffleEntranceFee if web3 is Enabled
    useEffect(() => {
        if (isWeb3Enabled) {
            // try to read RaffleEntranceFee

            // can't use await inside useEffect
            // const something = await getEntranceFee()

            // workaround

            updateUIValues()

            // adding it in dependency because if dependency is blank useEffect will run only once
            // at that time (most probably) isWeb3Enabled will be false => function is never called
            // in the manualHeader: when refreshed, browser checks localStorage to see if web3 should be enabled
            // if it should be enabled then enableWeb3() is called which changes the state of isWeb3Enabled from false to true
            // if isWeb3Enabled changes from false to true then all the useEffect with dependencies isWeb3Enabled are run including this one

            // NOTE: check the connection between useMoralis() and MoralisProvider (isWeb3Enabled of different pages are linked)
        }
    }, [isWeb3Enabled])

    // why split handleSuccess and HandleNotification into two?
    const handleSuccess = async function (tx) {
        // wait for the transaction to go through
        await tx.wait(1)
        handleNewNotification(tx)
        // this is required because otherwise given wallet is connected, if another player enters the raffle setNumPlayers and setRecentWinners will not be called because isWeb3Enabled didn't change and we'll have to reload to see the changes reflected on the screen
        // so by adding updateUIValues here => call the setNumPlayers and setRecentWinners and re-render whenever there is any sucessful transaction
        updateUIValues()
    }

    const handleNewNotification = function (tx) {
        dispatch({
            type: "info",
            message: "Transaction Complete!",
            title: "Transaction Notification",
            position: "topR",
            icon: "bell",
        })
    }

    // CHALLLENGE: UPDATE THE UI WHEN SOME EVENT IS TRIGGERED BY RAFFLE CONTRACT

    return (
        <div>
            {/* making sure that can only call the function so long as there is a Raffle address */}
            <div className=" py-20 flex flex-row justify-center items-center">
                <div className=" py-10 px-6 max-w-xl w-4/5 bg-black/[0.7] rounded-lg shadow-lg">
                    <h1 className=" w-full text-5xl mt-auto text-center">Welcome to Dlottery</h1>
                    <div className="w-ful">
                        <h1 className=" text-4xl p-10 text-center">Current Stats</h1>
                        {raffleAddress ? (
                            <>
                                <div className="py-3 flex flex-row justify-between items-center">
                                    <h1 className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
                                        Entrance Fee:
                                    </h1>
                                    <p className="text-xl font-bold">
                                        {ethers.utils.formatUnits(entranceFee, "ether")} ETH
                                    </p>
                                </div>
                                <div className="py-3 flex flex-row justify-between items-center">
                                    <h1 className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
                                        Players:
                                    </h1>
                                    <p className="text-xl font-bold">{numPlayers}</p>
                                </div>
                                <div className="py-3 flex flex-row justify-between items-center">
                                    <h1 className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
                                        recentWinner:
                                    </h1>
                                    <p className=" text-sm">{recentWinner}</p>
                                </div>

                                <div className="buttonWrapper flex flex-row justify-center">
                                    <button
                                        className=" cursor-pointer rounded-md px-20 py-3 mt-10 text-xl font-bold text-gray-900 bg-white hover:scale-y-105 transition-all w-full"
                                        onClick={async () =>
                                            await enterRaffle({
                                                // onSuccess is'nt checking that the transaction has a block confirmation
                                                // it's just checking to see that the transaction was successfully sent to Metamask
                                                // that is why we have done tx.wait(1) in the handleSuccess
                                                onSuccess: handleSuccess,
                                                onError: (error) => console.log(error),
                                                // onComplete:,
                                                // onError:,
                                            })
                                        }
                                        disabled={isLoading || isFetching}
                                    >
                                        {isLoading || isFetching ? (
                                            <div className=" animate-spin spinner-border h-8 w-8 border-b-2 rounded-full"></div>
                                        ) : (
                                            <div>Enter Raffle</div>
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center font-bold underline text-xl">
                                Please connect to suported chain
                            </div>
                        )}
                    </div>
                </div>

                {/* Entrance Fee: {ethers.utils.formatUnits(entranceFee, "ether")}ETH */}
            </div>
        </div>
    )

    // make our code such that it works even when we are in supported chain
    // if we switch from hardhat to ethereum mainnet and refresh gives an error
    // because calling getEntranceFee on address that doesn't exist
}
