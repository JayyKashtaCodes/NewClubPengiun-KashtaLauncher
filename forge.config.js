module.exports = {
  packagerConfig: {
    icon: "./src/assets/logo.ico"
  },
  rebuildConfig: {},
  makers: [{
    name: '@electron-forge/maker-squirrel',
    config: {setupIcon: "./src/assets/logo.ico"}}
  ],
  publishers: [],
  plugins: [],
  hooks: {},
  buildIdentifier: "09042024-10001",
};
