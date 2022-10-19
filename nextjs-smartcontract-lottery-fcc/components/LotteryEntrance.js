// have a function to enter the lottery

import { contractAddresses, abi } from "../constants"
// dont export from moralis when using react
import { useMoralis, useWeb3Contract } from "react-moralis"
import { useEffect, useState } from "react"
import { ethers } from "ethers"

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

    // runContractFunction can both send transaction and read state
    // all the variables => data, error, runContractFunction, isFetching, isLoading
    const { runContractFunction: enterRaffle } = useWeb3Contract({
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

    async function updateUIValues() {
        // const entranceFee = (await getEntranceFee()).toString()
        // console.log(entranceFee)
        // can't display entranceFee to the browser directly because before the value was undefined and now it is some XYZ
        // but the browser didn't re-render when the value of the entranceFee changed => browser showing blank while it displays value on the console
        // To re-render the browser when the entranceFee changes => useState() Hook
        const entranceFeeFromCall = (await getEntranceFee()).toString()
        setEntranceFee(entranceFeeFromCall)

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

    return (
        <div>
            Hi from Lottery Entrance.
            {/* making sure that can only call the function so long as there is a Raffle address */}
            {raffleAddress ? (
                <>
                    <button onClick={async () => await enterRaffle({})}>Enter Raffle</button>
                    {/* Entrance Fee: {ethers.utils.formatUnits(entranceFee, "ether")}ETH */}
                    <div>Entrance Fee: {ethers.utils.formatUnits(entranceFee, "ether")} ETH</div>
                </>
            ) : (
                <div>Please connect to a supported chain </div>
            )}
        </div>
    )

    // make our code such that it works even when we are in supported chain
    // if we switch from hardhat to ethereum mainnet and refresh gives an error
    // because calling getEntranceFee on address that doesn't exist
}
