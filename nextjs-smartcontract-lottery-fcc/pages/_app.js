import "../styles/globals.css"
import { MoralisProvider } from "react-moralis"
import { NotificationProvider } from "web3uikit"

function MyApp({ Component, pageProps }) {
    // in order to use moralis entire application needs to be wrapped around a Moralis provider
    // Moralis provider is a context provider
    return (
        // initialzeOnMount => to hook into a server
        <MoralisProvider initializeOnMount={false}>
            <NotificationProvider>
                <Component {...pageProps} />
            </NotificationProvider>
        </MoralisProvider>
    )
}

export default MyApp
