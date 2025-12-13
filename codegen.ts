import type { CodegenConfig } from '@graphql-codegen/cli'
const config: CodegenConfig = {
  schema: 'http://192.168.81.172:10005/api/v1/samsClub/graphql',
  documents: [],
  ignoreNoDocuments: true, // for better experience with the watcher
  generates: {
    './src/gql/samsclub/': {
      preset: 'client',
      config: {
        useTypeImports: true
      },
      plugins: []
    }
  }
}

export default config
