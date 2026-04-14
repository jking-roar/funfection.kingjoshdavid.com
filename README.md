# funfection.kingjoshdavid.com
Site for the funfection app

## Setup

This is a GitHub Pages site that serves as the Android App Links verification domain for the Funfection Android app. It handles deep-link URLs of the form:

```
https://funfection.kingjoshdavid.com/infect?code=PUT_CODE_HERE#and.various.fragment.details.here
```

### Before deploying

Replace the placeholder SHA-256 fingerprint in `.well-known/assetlinks.json` with the actual signing certificate fingerprint from your Android app. You can retrieve it by running:

```bash
keytool -list -v -keystore <your-keystore>.jks -alias <your-alias> 2>/dev/null | grep SHA256
```

Leaving the placeholder value in place will cause Android App Links verification to fail and the OS will not open the app when the link is tapped.
