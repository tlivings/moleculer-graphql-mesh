
import { createGraphQLMixin } from '../../../src/index';

const a = createGraphQLMixin({
  types: `
    type A {
      id: ID,
      value: String
    }
    type Query {
      a(id: ID): A
    }
  `,
  resolvers: {
    Query: {
      a(_, { id }) {
        return { id, value: 'hello A' };
      }
    }
  }
});

export = {
  name: 'gqlA',
  mixins: [a]
};