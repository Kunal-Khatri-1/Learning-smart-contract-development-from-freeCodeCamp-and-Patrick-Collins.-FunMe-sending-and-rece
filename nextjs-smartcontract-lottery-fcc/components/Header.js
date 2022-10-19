import { ConnectButton } from "web3uikit"

export default function Header() {
    return (
        <div>
            {/* moralisAuth = false => not going to connect to a server */}
            Decentralized Lottery
            <ConnectButton moralisAuth={false} />
        </div>
    )
}
