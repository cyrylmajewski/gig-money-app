# GigMoney

Personal finance app for gig economy workers in Poland. Helps distribute irregular income across essential needs and debt repayment using the debt snowball strategy.

Built with React Native, Expo, TypeScript, and Tamagui.

## Prerequisites (macOS)

- **Node.js** >= 22 — install via [nvm](https://github.com/nvm-sh/nvm) or [Homebrew](https://brew.sh) (`brew install node`)
- **Xcode** — install from the Mac App Store, then run:
  ```bash
  sudo xcode-select --switch /Applications/Xcode.app
  ```
- **CocoaPods** — comes with Xcode, or install via `sudo gem install cocoapods`
- **iOS Simulator** — open Xcode > Settings > Platforms > download iOS simulator

For Android: install [Android Studio](https://developer.android.com/studio) and set up an emulator via AVD Manager.

## Getting Started

```bash
# Install dependencies
npm install

# Build and run on iOS simulator (recommended)
npx expo run:ios

# Build and run on Android emulator
npx expo run:android

# Or start dev server only (limited — native modules won't work in Expo Go)
npx expo start

# Lint
npx expo lint
```

## Running on a Physical Device

### iOS (requires macOS + Xcode)

```bash
# Build and run on a connected iPhone
npx expo run:ios --device
```

If this is your first time:
1. Connect your iPhone via USB and trust the computer
2. Open the generated `ios/` folder in Xcode
3. Go to **Signing & Capabilities** and select your Apple Developer team
4. Select your iPhone as the build target and run

### Android

```bash
# Build and run on a connected Android device
npx expo run:android --device
```

To set up your phone:
1. Enable **Developer Options** (tap Build Number 7 times in Settings > About Phone)
2. Enable **USB Debugging** in Developer Options
3. Connect via USB and accept the debugging prompt on the phone
