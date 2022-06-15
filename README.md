<img src="nfid.png" style="width:100%;max-width:500px;margin:auto;margin-bottom:50px"></img>

# Getting started with the NFID Auth-Client Demo

This is an example project, intended to demonstrate how an app developer might integrate with [NFID](https://nfid.one).

For a non-typescript implementation, see https://github.com/internet-identity-labs/nfid-auth-client-demo/tree/vanilla-js

[Live demo on Kinic](https://kinic.io/)

To learn more before you start working with auth_demo, it may be helpful to review the [Internet Computer documentation](https://internetcomputer.org/docs/current/developer-docs/ic-overview).

## Requirements

Make sure to update your @dfinity/agent, @dfinity/identity, and @dfinity/auth-client node packages to >0.11.0

## The authentication client

Breaking down the authentication steps from the main [index.ts](https://github.com/internet-identity-labs/nfid-auth-client-demo/blob/feature/nfid-auth-client-demo/src/auth_client_demo_assets/src/index.ts) file, we need to:
1. initialize an authClient and handle an already-authenticated user
```js
  const authClient = await AuthClient.create();
  if (await authClient.isAuthenticated()) {
    handleAuthenticated(authClient);
  }
```
> **_NOTE:_**  AuthClient automatically signs the user out after 10 minutes of inactivity
To disable idle timeouts, pass AuthClient this option during creation:
```js
AuthClient.create({idleOptions: {disableIdle: true}})
```
To set a different timeout time than the 10 minute default:
```js
AuthClient.create({idleOptions: {idleTimeout: timeoutDurationInMS}})
```
To allow scrolling to reset idleTimeout (false by default):
```js
AuthClient.create({idleOptions: {captureScroll: true}})
```
Debounce is set to 100ms when scrolling to reset idleTimeout is enabled, but can be changed:
```js
AuthClient.create({idleOptions: {scrollDebounce: timeInMS}})
```
To register a callback function when a user times out:
```js
AuthClient.create({idleOptions: {onIdle: callbackFunction}})

// in this repo, you will find that we instead registerCallback
// from the handleAuthenticated function like this
authClient.idleManager?.registerCallback(() => {
  Actor.agentOf(whoami_actor)?.invalidateIdentity?.();
  renderIndex();
});
```
2. prepare maxTimeToLive for the identity delegate of up to 30 days
```js
  const days = BigInt(30);
  const hours = BigInt(24);
  const nanosecondsPerHour = BigInt(3600000000000);
```
3. customize your application name and logo (URI encoded)
```js
  const APPLICATION_NAME = "Your%20Application%20Name";
  const APPLICATION_LOGO_URL = "https%3A%2F%2Flogo.clearbit.com%2Fclearbit.com";
```
4. initialize a login click handler 
```js
  loginButton.onclick = async () => {
    await authClient.login({
      onSuccess: async () => {
        handleAuthenticated(authClient);
      },
      identityProvider:
        process.env.DFX_NETWORK === "ic"
          ? "https://nfid.one" + AUTH_PATH
          : process.env.LOCAL_NFID_CANISTER + AUTH_PATH,
      // Maximum authorization expiration is 30 days
      maxTimeToLive: days * hours * nanosecondsPerHour,
      windowOpenerFeatures: 
        `left=${window.screen.width / 2 - 200}, `+
        `top=${window.screen.height / 2 - 300},` +
        `toolbar=0,location=0,menubar=0,width=400,height=600`
    });
  };
```
5. handle an authentication event
```js
async function handleAuthenticated(authClient: AuthClient) {
  const identity = (await authClient.getIdentity()) as unknown as Identity;
  const whoami_actor = createActor(canisterId as string, {
    agentOptions: {
      identity,
    },
  });
  // Invalidate identity then render login when user goes idle
  // This is unnecessary if you disable idleTimeout
  authClient.idleManager?.registerCallback(() => {
    Actor.agentOf(whoami_actor)?.invalidateIdentity?.();
    // user has idled out - render your loggedOut logic
  });

  // user is logged in - render your loggedIn logic
}
```

You've now bootstrapped a `whoami` actor! 
> **_NOTE:_**  This actor cannot make authenticated calls in your local environment unless NFID is installed locally. See `Making authenticated calls in your local replica` section for instructions.

With this actor, you can make authenticated calls to your backend and retrieve the user's unique identifier for your app:

Motoko
```
public shared (message) func whoami() : async Principal {
    return message.caller;
};
```

Rust
```
pub fn whoami() -> Principal { ic_cdk::api::caller() }
```

On the frontend, you may call `identity?.getPrincipal().toText()` to retrieve this user's unique identifier.

## Setting up this project locally

Clone this repo and start a local dfx development environment in this directory with the following steps:

```bash
cd nfid-auth-client-demo/
yarn
dfx start --background --clean
dfx deploy
```

### Authenticated calls in your local replica

At present, the Internet Computer's signatures don't allow actors created in production to make authenticated calls locally.

If you want to make authenticated calls on your local replica, you will need the [NFID-SDK](https://github.com/internet-identity-labs/NFID-SDK) repo cloned locally, adjacent to this project. 

```bash
cd ../nfid-sdk
DFX_VERSION=0.9.3 sh -ci "$(curl -fsSL https://sdk.dfinity.org/install.sh)"
yarn
rm -rf .dfx/local
cd examples/create-ic-app-react-demo
rm -rf .dfx/local
yarn deploy:local
yarn serve:nfid-frontend
```

### Enabling QR code support in local development

At present, we only support webauthn as a means of registering and authenticating with private keys. Because this complicates the UX for adding new devices, we've chosen to encourage users first register their most important device - their phone - by scanning a QR code displayed on non-mobile devices.

Apple, Google, and Microsoft announced in May 2022 their upcoming support for passkeys, which has a similar flow and will decrease complexity of the NFID registration process once fully released.

If you wish to test this flow locally, you'll need ngrok to create the tunnel.

[Download](https://ngrok.com/download) the ngrok zip file for your machine and unpack the binary to `NFID-SDK/examples/create-ic-app-react-demo/scripts`, then run `yarn tunnel` from within that directory.
```bash
# in a new terminal window, cd to scripts directory where you've unpacked the ngrok binary
cd scripts
yarn tunnel
```
Paste the assigned domain from ngrok output to the `LOCAL_NGROK_TUNNEL_DOMAIN` variable on line `13` of `webpack.config.js`
![running-ngrok](./running-ngrok.png)

Finally, cd back into the `nfid-auth-client-demo` and run `npm start`
```bash
cd ../../../../nfid-auth-client-demo
npm start
```

You can now access the app at `http://localhost:8080`.
