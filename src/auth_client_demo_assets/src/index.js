import { AuthClient } from "@dfinity/auth-client";
import { renderIndex } from "./views";
import { renderLoggedIn } from "./views/loggedIn";
import { canisterId, createActor } from "../../declarations/whoami";

const init = async () => {
  const authClient = await AuthClient.create();
  if (await authClient.isAuthenticated()) {
    handleAuthenticated(authClient);
  }
  renderIndex();

  const loginButton = document.getElementById("loginButton");

  const days = BigInt(1);
  const hours = BigInt(24);
  const nanoseconds = BigInt(3600000000000);

  const APPLICATION_NAME = "Your%20Application%20Name";
  const APPLICATION_LOGO_URL = "https%3A%2F%2Flogo.clearbit.com%2Fclearbit.com"

  loginButton.onclick = async () => {
    await authClient.login({
      onSuccess: async () => {
        handleAuthenticated(authClient);
      },
      identityProvider:
        process.env.DFX_NETWORK === "ic"
          ? "https://nfid.one/authenticate/?applicationName="+APPLICATION_NAME+"&applicationLogo="+APPLICATION_LOGO_URL+"#authorize"
          : process.env.LOCAL_NFID_CANISTER+"/authenticate/?applicationName="+APPLICATION_NAME+"&applicationLogo="+APPLICATION_LOGO_URL+"#authorize",
      // Maximum authorization expiration is 8 days
      maxTimeToLive: days * hours * nanoseconds,
      windowOpenerFeatures: 
        `left=${window.screen.width / 2 - 200}, `+
        `top=${window.screen.height / 2 - 300},` +
        `toolbar=0,location=0,menubar=0,width=400,height=600`
    });
  };
};

async function handleAuthenticated(authClient) {
  const identity = await authClient.getIdentity();
  const whoami_actor = createActor(canisterId, {
    agentOptions: {
      identity,
    },
  });

  renderLoggedIn(whoami_actor, authClient);
}

init();
