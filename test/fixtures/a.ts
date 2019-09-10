
import { createGraphQLMixin } from '../../src/index';

export default createGraphQLMixin({
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