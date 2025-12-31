# X Visited Profile Indicator

Chrome extension that marks visited X (Twitter) profiles with a strikethrough style.

## Features

- Automatically marks visited user profiles
- Works on x.com, twitter.com, and mobile.twitter.com
- Lightweight implementation with no external dependencies
- Privacy-focused: all data stored locally

## Technical Details

- Manifest V3 compliant
- TypeScript implementation
- React-based options page
- Service worker background script
- Vanilla JS content scripts (no jQuery)

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Load unpacked extension from `dist` folder in Chrome

## Development

- `npm run watch` - Watch mode for development
- `npm run build` - Production build
- `npm run clean` - Clean build artifacts
- `npm run package` - Create distribution zip
- `npm run style` - Format code with Prettier

## Privacy

All visited profile data is stored locally on your device using Chrome's storage API. No data is transmitted to external servers.

## License

MIT