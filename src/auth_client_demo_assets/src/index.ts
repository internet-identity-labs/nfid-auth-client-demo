import { AuthClient } from "@dfinity/auth-client";
import { renderIndex } from "./views";
import { renderLoggedIn } from "./views/loggedIn";
import { canisterId, createActor } from "../../declarations/whoami";
import { Actor, Identity } from "@dfinity/agent";

const init = async () => {
  const authClient = await AuthClient.create();
  if (await authClient.isAuthenticated()) {
    handleAuthenticated(authClient);
  }
  renderIndex();

  const loginButton = document.getElementById(
    "loginButton"
  ) as HTMLButtonElement;

  const days = BigInt(1);
  const hours = BigInt(24);
  const nanoseconds = BigInt(3600000000000);

  const APPLICATION_NAME = "Your%20Application%20Name";

  loginButton.onclick = async () => {
    await authClient.login({
      onSuccess: async () => {
        handleAuthenticated(authClient);
      },
      identityProvider:
        process.env.DFX_NETWORK === "ic"
          ? "https://3y5ko-7qaaa-aaaal-aaaaq-cai.ic0.app/authenticate/?applicationName="+APPLICATION_NAME+"#authorize"
          : process.env.LOCAL_NFID_CANISTER+"/authenticate/?applicationName="+APPLICATION_NAME+"#authorize",
      // Maximum authorization expiration is 8 days
      maxTimeToLive: days * hours * nanoseconds,
    });
  };
};

async function handleAuthenticated(authClient: AuthClient) {
  const identity = (await authClient.getIdentity()) as unknown as Identity;
  const whoami_actor = createActor(canisterId as string, {
    agentOptions: {
      identity,
    },
  });
  // Invalidate identity then render login when user goes idle
  authClient.idleManager?.registerCallback(() => {
    Actor.agentOf(whoami_actor)?.invalidateIdentity?.();
    renderIndex();
  });

  renderLoggedIn(whoami_actor, authClient);
}

init();
