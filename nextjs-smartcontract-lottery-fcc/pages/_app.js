import "../styles/globals.css"
import { MoralisProvider } from "react-moralis"

function MyApp({ Component, pageProps }) {
    // in order to use moralis entire application needs to be wrapped around a Moralis provider
    // Moralis provider is a context provider
    return (
        // initialzeOnMount => to hook into a server
        <MoralisProvider initializeOnMount={false}>
            <Component {...pageProps} />
        </MoralisProvider>
    )
}

export default MyApp
