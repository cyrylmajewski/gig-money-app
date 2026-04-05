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
