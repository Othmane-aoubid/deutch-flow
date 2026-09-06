import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    rules: {
      // This codebase intentionally logs errors to the browser console for diagnostics.
      'no-console': 'off',
      // Pre-existing useEffect patterns (helpers declared after use, sync setState in
      // effects) trigger these two new rules; they work correctly today. Surfacing
      // them as warnings instead of refactoring working code.
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]

export default eslintConfig
