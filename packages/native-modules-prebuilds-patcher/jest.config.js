module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest',
    "^.+\\.(js|jsx)?$": ['babel-jest'] 
  },
  roots: ['./'],
  globalSetup: "../../Shared/TestUtils/TestStarter.ts",
  modulePathIgnorePatterns: ["<rootDir>/tests/Test.Utilities/MockObjects"]
};