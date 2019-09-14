
import { createGraphQLMixin } from '../../../src/index';

const a = createGraphQLMixin({
  types: `
    type A {
      id: ID,
      value: String,
      hot: String
    }
    type Query {
      a(id: ID): A
    }
  `,
  resolvers: {
    Query: {
      a(_, { id }) {
        return { id, value: 'hello A', hot: 'hot!' };
      }
    }
  }
});

export = {
  name: 'gqlA',
  mixins: [a],
  settings: {
    graphql: {
      gatewayPort: 4000
    }
  }
};