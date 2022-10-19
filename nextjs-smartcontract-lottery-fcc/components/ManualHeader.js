import { useMoralis } from "react-moralis"
import { useEffect } from "react"

export default function Header() {
    // useMoralis is a hook
    // way to keep track of state in application

    // enableWeb3 is equivalent of await ethereum.request({method: "eth_requestAccounts"})
    // isWeb3Enabled => wether or not metamask is connected
    // account => address of the connected Web3 wallet
    // ton more variables here => https://www.npmjs.com/package/react-moralis#usemoralis

    // using account and not isWeb3Enabled because maybe web3isEnabled but account is not connected
    const { enableWeb3, account, isWeb3Enabled, Moralis, deactivateWeb3 } = useMoralis()

    // StrictMode renders components twice (on dev but not production) in order to detect any problems with your code and warn you about them (which can be quite useful).
    // when page is refreshed entire component is rerendered and account and isWeb3Enabled is initialized to default fasly values
    // then when we click the connect button, enableWeb3 is run and account and isWeb3Enabled gets its values
    // no-dependencies => run anytime something re-renders
    // blank depenedency array => run only once onload
    useEffect(() => {
        // if already connected, no need to do anything
        if (isWeb3Enabled) return
        // if we were connected and hit refresh we will not get metamask pop-up
        // website remembers that we had clicked connect and are connected to metamask and we have hit a refresh
        // now to set account and isWeb3Enabled we run enableWeb3
        // using this over directly writing enableWeb3 is that if reloaded without connecting, then metamask will not pop up (given local storage is clear)
        if (typeof window !== undefined) {
            if (window.localStorage.getItem("connected")) {
                enableWeb3()
            }
        }
    }, [isWeb3Enabled])

    // useEffect to see if we have disconnected
    // whenever there is a re-render check if any account changed
    useEffect(() => {
        //
        Moralis.onAccountChanged((account) => {
            console.log(`Account changed to ${account}`)

            // account == null => disconnected
            if (account == null) {
                window.localStorage.removeItem("connected")
                // deactivateWeb3 sets isWeb3Enabled to false
                deactivateWeb3()
                console.log("Null account found")
            }
        })
    }, [])

    return (
        <div>
            {account ? (
                <div>
                    Connected to {account.slice(0, 6)}... {account.slice(account.length - 4)}{" "}
                </div>
            ) : (
                <button
                    onClick={async () => {
                        await enableWeb3()
                        // remembering that connect was once clicked to avoid getting metamask pop up when we are not connected and hit refresh
                        if (typeof window !== undefined) {
                            window.localStorage.setItem("connected", "injected")
                        }
                    }}
                >
                    Connect
                </button>
            )}
        </div>
    )
}
