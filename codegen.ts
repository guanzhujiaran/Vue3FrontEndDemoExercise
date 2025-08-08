import type { CodegenConfig } from '@graphql-codegen/cli'
const config: CodegenConfig = {
  schema: 'http://127.0.0.1:23333/api/v1/samsClub/graphql',
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
