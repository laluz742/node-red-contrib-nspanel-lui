module.exports = {
    collectCoverage: true,
    collectCoverageFrom: ['**/*.{ts}'],
    coverageDirectory: 'coverage',
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts?$': 'ts-jest',
    },
    transformIgnorePatterns: ['<rootDir>/node_modules/'],
}
