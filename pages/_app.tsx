import "../styles/globals.css";
import type { AppProps } from "next/app";
import ChatBubble from "../components/ChatBubble";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <ChatBubble />
    </>
  );
}
