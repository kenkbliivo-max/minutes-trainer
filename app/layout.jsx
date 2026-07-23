import "./globals.css";
import Nav from "@/components/Nav";

export const metadata = {
  title: "議事録練習アプリ",
  description: "架空の会議で議事ドキュメント作成を練習し、AIの採点で上達する",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <Nav />
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
