
import { createGraphQLMixin } from '../../../src/index';

const b = createGraphQLMixin({
  types: `
    type B {
      id: ID,
      value: String
      a: A
    }
    type Query {
      b: B
    }
  `,
  resolvers: {
    Query: {
      async b() {
        return { id: 1, value: 'hello B', a: { id: 1, value: 'A from B' } };
      }
    }
  },
  dependencies: ['gqlA']
});

export = {
  name: 'gqlB',
  mixins: [b],
  settings: {
    graphql: {
      gatewayPort: 4001
    }
  }
};
