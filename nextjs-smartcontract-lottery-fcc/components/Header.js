import { ConnectButton } from "web3uikit"
import Link from "next/link"

export default function Header() {
    return (
        <div className=" border-b-2 p-5 flex flex-row items-center">
            {/* moralisAuth = false => not going to connect to a server */}
            <Link href="/">
                <a>
                    <h1 className=" py-4 px-4 font-bold text-3xl font-sans drop-shadow-[0_35px_35px_rgba(0,0,0,0.25)]">
                        Dlottery
                    </h1>
                </a>
            </Link>
            <div className="ml-auto py-2 px-4">
                <ConnectButton moralisAuth={false} />
            </div>
        </div>
    )
}
