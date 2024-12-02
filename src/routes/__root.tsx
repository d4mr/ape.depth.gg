/* eslint-disable no-useless-escape */
import { client } from "@/client";
import { ConfigModal } from "@/components/config-modal";
import { CryptoSearch } from "@/components/crypto-search";
import { Button } from "@/components/ui/button";
import { getBirdeyeApiKey } from "@/config";
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { Settings } from "lucide-react";
import { useState } from "react";
import { ConnectButton } from "thirdweb/react";

const RootComponent = () => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const apiKey = getBirdeyeApiKey();

  return (
    <>
      <ConfigModal open={isConfigOpen} onOpenChange={setIsConfigOpen} />
      <div className="h-full flex flex-col min-h-0">
        <div className="p-2 grid grid-cols-[auto_1fr_auto] gap-2 dark">
          <div className="my-auto">
            <Link to="/" className="text-sm font-logo flex text-pink-500">
              {"> ape.depth.gg"}
            </Link>
          </div>
          <div className="grid place-items-center">
            <CryptoSearch />
          </div>

          <div className="flex flex-row gap-2 items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsConfigOpen(true)}
              className="shrink-0"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <ConnectButton
              client={client}
              signInButton={{
                className: "p-1",
              }}
              connectButton={{
                style: {
                  height: "auto",
                  paddingTop: "0.5rem",
                  paddingBottom: "0.5rem",
                },
              }}
            />
          </div>
        </div>
        <div className="flex-grow h-full overflow-hidden">
          {apiKey ? (
            <Outlet />
          ) : (
            <div className="font-logo text-sm text-muted-foreground grid place-items-center pt-20 gap-8">
              <div className="w-[500px] pl-8">
                <pre className="text-xs">{monkey}</pre>
              </div>
              <p className="text-lg w-96 text-center">
                Please set BirdEye API Key and refresh page to use app
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export const Route = createRootRoute({
  component: RootComponent,
});

const monkey = `
\#\#,                                   ,\#\#
\'\#\#,                                 ,\#\#\'
 \'\#\#                                 \#\#\'
  \#\#               __,               \#\#
  \#\#          __.-\'   \\              \#\#
  \#\#    ___.-\'__.--\'\\ \|              \#\#,
  \#\# .-\' .-, \(      \| \|        _     \'\#\#
  \#\#/ / /\"\"=\\ \\     \| \|       / \\     \#\#,
  \'\#\| \|_\\   / /     \| \|      /   \\    \'\#\#
  / \`-\` 0 0 \'-\'\`\\   \| \|      \| \|  \\   ,\#\#
  \\_,   \(__\)  ,_/  / /       \|  \\  \\  \#\#\'
   / /    \\   \\\\  / /        \|  \|\\  \\ \#\# __
  \| /\`.__.-\'-._\)\|/ /         \|  \| \\  \\\#\#\`__\)
  \\        \^    / /          \|  \|  \| v\#\# \'--.
   \'._    \'-\'_.\' / _.----.   \|  \|  l ,\#\#  \(_,\'
    \'\#\#\'-,  \` \`\"\"\"/       \`\'/\|  \| / ,\#\#--,  \)
     \'\#/\`        \`         \'    \|\'  \#\#\'   \`\"
      \|                         /\\_/\#\'
 jgs  \|              __.  .-,_.\;\#\#\#\`
     _\|___/_..---\'\'\'\`   _/  \(\#\#\#\'
 .-\'\`   ____,...---\"\"\`\`\`     \`._
\(   --\'\'        __,.,---.    \',_\)
 \`.,___,..---\'\`\`  / /    \\     \'._
      \|  \|       \( \(      \`.  \'-._\)
      \|  /        \\ \\      \\\'-._\)
      \| \|          \\ \\      \`\"\`
      \| \|           \\ \\
      \| \|    .-,     \) \|
      \| \|   \( \(     / /
      \| \|    \\ \'---\' /
      /  \\    \`-----\`
     \| , /
     \|\(_/\\-,
     \\  ,_\`\)
      \`-._\)
`;
