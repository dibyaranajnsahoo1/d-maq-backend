import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/apps/**/*.spec.ts',
    '<rootDir>/auth/**/*.spec.ts',
    '<rootDir>/tasks/**/*.spec.ts',
    '<rootDir>/analytics/**/*.spec.ts',
    '<rootDir>/utils/**/*.spec.ts',
  ],
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.base.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@dmaq/auth$': '<rootDir>/auth/src/index.ts',
    '^@dmaq/models$': '<rootDir>/models/src/index.ts',
    '^@dmaq/data-access$': '<rootDir>/data-access/src/index.ts',
    '^@dmaq/tasks$': '<rootDir>/tasks/src/index.ts',
    '^@dmaq/users$': '<rootDir>/users/src/index.ts',
    '^@dmaq/analytics$': '<rootDir>/analytics/src/index.ts',
    '^@dmaq/utils$': '<rootDir>/utils/src/index.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  collectCoverageFrom: [
    'apps/api/src/**/*.ts',
    'auth/src/**/*.ts',
    'tasks/src/**/*.ts',
    'analytics/src/**/*.ts',
    'utils/src/**/*.ts',
    '!**/*.module.ts',
    '!**/index.ts',
    '!**/main.ts',
    '!**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
  },
};

export default config;
